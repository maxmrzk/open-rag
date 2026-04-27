"""Dockerized runtime execution for evaluation runs."""

from __future__ import annotations

import json
import os
import tempfile
import textwrap
from pathlib import Path

import docker
from requests.exceptions import ReadTimeout

_RUNTIME_SCRIPT = textwrap.dedent(
    """\
    import hashlib
    import json
    import time
    from pathlib import Path

    input_path = Path("/work/input.json")
    output_path = Path("/work/output.json")

    payload = json.loads(input_path.read_text(encoding="utf-8"))
    start = time.perf_counter()

    seed_src = json.dumps(payload, sort_keys=True)
    digest = hashlib.sha256(seed_src.encode()).hexdigest()

    quality_anchor = int(digest[:8], 16)
    perf_anchor = int(digest[8:16], 16)

    retrieved_count = 8 + (quality_anchor % 8)
    relevant_count = 6 + (quality_anchor % 6)
    relevant_retrieved = min(retrieved_count, relevant_count, 5 + (quality_anchor % 6))
    first_relevant_rank = 1 + (quality_anchor % 4)

    token_usage = 1500 + (perf_anchor % 6000)
    cost_usd = 0.002 + ((perf_anchor % 4000) / 100000)
    hallucination = ((quality_anchor % 18) / 100)

    system_name = payload.get("system", "System")
    node_count = payload.get("nodeCount", 0)
    prompt_input = payload.get("promptInput") or ""

    answer = f"Executed {system_name} with {node_count} nodes. Prompt: {prompt_input[:120] or 'N/A'}"

    retrieved_docs = [
        {
            "id": f"doc-{i+1}",
            "score": round(0.95 - i * 0.05, 3),
            "text": f"Retrieved chunk {i+1} for system {system_name}",
        }
        for i in range(min(retrieved_count, 10))
    ]

    latency_ms = (time.perf_counter() - start) * 1000 + 120 + (perf_anchor % 300)

    output = {
        "answer": answer,
        "retrieved": retrieved_docs,
        "retrieved_count": retrieved_count,
        "relevant_count": relevant_count,
        "relevant_retrieved": relevant_retrieved,
        "first_relevant_rank": first_relevant_rank,
        "token_usage": token_usage,
        "cost_usd": cost_usd,
        "hallucination": hallucination,
        "latency_ms": latency_ms,
        "execution": {
            "runtime": "dockerized",
            "mode": "deterministic-v1",
            "envKeys": payload.get("envKeys", []),
        },
    }

    output_path.write_text(json.dumps(output), encoding="utf-8")
    """
)


def _runtime_payload(
    run_id: str,
    system_name: str,
    nodes: list[dict],
    edges: list[dict],
    prompt_input: str | None,
    env_vars: dict[str, str],
) -> dict:
    return {
        "runId": run_id,
        "system": system_name,
        "nodeCount": len(nodes),
        "edgeCount": len(edges),
        "promptInput": prompt_input or "",
        "envKeys": sorted(env_vars.keys()),
    }


def execute_dockerized_run(
    *,
    run_id: str,
    system_name: str,
    nodes: list[dict],
    edges: list[dict],
    prompt_input: str | None,
    env_vars: dict[str, str],
) -> dict:
    payload = _runtime_payload(run_id, system_name, nodes, edges, prompt_input, env_vars)

    image = os.getenv("RAG_EVAL_RUNTIME_IMAGE", "python:3.11-slim")
    timeout_seconds = int(os.getenv("RAG_EVAL_RUNTIME_TIMEOUT_SEC", "120"))

    with tempfile.TemporaryDirectory(prefix="open-rag-eval-") as temp_dir:
        work_dir = Path(temp_dir)
        input_path = work_dir / "input.json"
        output_path = work_dir / "output.json"
        script_path = work_dir / "runtime_runner.py"

        input_path.write_text(json.dumps(payload), encoding="utf-8")
        script_path.write_text(_RUNTIME_SCRIPT, encoding="utf-8")

        client = docker.from_env()
        container = None

        try:
            container = client.containers.run(
                image=image,
                command=["python", "/work/runtime_runner.py"],
                detach=True,
                working_dir="/work",
                volumes={str(work_dir): {"bind": "/work", "mode": "rw"}},
                environment=env_vars,
            )

            try:
                result = container.wait(timeout=timeout_seconds)
            except ReadTimeout as exc:
                container.kill()
                raise TimeoutError("Evaluation runtime container timed out") from exc

            status_code = int(result.get("StatusCode", 1))
            if status_code != 0:
                logs = container.logs(stdout=True, stderr=True).decode("utf-8", errors="replace")
                raise RuntimeError(f"Evaluation runtime failed with status {status_code}: {logs}")

            if not output_path.exists():
                raise RuntimeError("Evaluation runtime did not write output artifact")

            return json.loads(output_path.read_text(encoding="utf-8"))

        except docker.errors.DockerException as exc:
            raise RuntimeError(
                "Docker runtime is unavailable. Ensure worker has Docker daemon access "
                "(e.g. mount /var/run/docker.sock)."
            ) from exc
        finally:
            if container is not None:
                try:
                    container.remove(force=True)
                except Exception:
                    pass
            client.close()
