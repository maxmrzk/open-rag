"""ARQ background worker — processes real evaluation run jobs.

Start with:
    arq app.worker.WorkerSettings
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.evaluation.docker_runtime import execute_dockerized_run
from app.evaluation.graph import normalize_graph
from app.evaluation.metrics import compute_metrics
from app.evaluation.resolver import env_from_graph, resolve_api_keys
from app.models.models import EvaluationRun, SystemDefinition

settings = get_settings()


async def evaluate_system(ctx: dict, run_id: str) -> None:
    """Execute the RAG pipeline for a run and write back real persisted outputs."""
    run_uuid = uuid.UUID(run_id)

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(EvaluationRun).where(EvaluationRun.id == run_uuid))
            run = result.scalar_one_or_none()
            if run is None:
                return

            # Idempotency guard
            if run.status == "completed":
                return

            run.status = "running"
            run.started_at = datetime.now(UTC)
            await db.flush()

            sys_result = await db.execute(
                select(SystemDefinition)
                .where(SystemDefinition.id == run.system_id)
                .options(selectinload(SystemDefinition.nodes), selectinload(SystemDefinition.edges))
            )
            system = sys_result.scalar_one_or_none()
            if system is None:
                raise ValueError("System definition for run not found")

            nodes = [
                {
                    "id": n.id,
                    "type": n.type,
                    "name": n.name,
                    "config": n.config or {},
                }
                for n in system.nodes
            ]
            edges = [{"id": e.id, "source": e.source, "target": e.target} for e in system.edges]

            # Validate + normalize graph (also enforces supported node types)
            normalize_graph(nodes, edges)

            resolved_keys = await resolve_api_keys(db)
            runtime_env = env_from_graph(nodes, resolved_keys)

            snapshot = run.config_snapshot or {}
            prompt_input = snapshot.get("_prompt_input")

            runtime_output = execute_dockerized_run(
                run_id=str(run.id),
                system_name=run.system_name,
                nodes=nodes,
                edges=edges,
                prompt_input=prompt_input,
                env_vars=runtime_env,
            )

            metrics = compute_metrics(
                runtime_output,
                latency_ms=float(runtime_output.get("latency_ms", 0.0)),
                token_usage=int(runtime_output.get("token_usage", 0)),
                cost_usd=float(runtime_output.get("cost_usd", 0.0)),
            )

            run.metric_precision = metrics["precision"]
            run.metric_recall = metrics["recall"]
            run.metric_mrr = metrics["mrr"]
            run.metric_latency_ms = metrics["latencyMs"]
            run.metric_token_usage = metrics["tokenUsage"]
            run.metric_cost_usd = metrics["costUsd"]
            run.metric_hallucination = metrics["hallucinationScore"]
            run.result_output = {
                "answer": runtime_output.get("answer"),
                "execution": runtime_output.get("execution"),
            }
            run.retrieval_trace = runtime_output.get("retrieved", [])
            run.metrics_detail = {
                "retrievedCount": runtime_output.get("retrieved_count", 0),
                "relevantCount": runtime_output.get("relevant_count", 0),
                "relevantRetrieved": runtime_output.get("relevant_retrieved", 0),
                "firstRelevantRank": runtime_output.get("first_relevant_rank", 0),
            }
            run.error_message = None
            run.status = "completed"
            run.completed_at = datetime.now(UTC)

            await db.commit()

    except Exception as exc:  # noqa: BLE001
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(EvaluationRun).where(EvaluationRun.id == run_uuid))
            run = result.scalar_one_or_none()
            if run:
                run.status = "failed"
                run.error_message = str(exc)
                run.completed_at = datetime.now(UTC)
                await db.commit()


class WorkerSettings:
    """ARQ worker configuration."""

    functions = [evaluate_system]
    redis_settings = None  # set dynamically below

    @classmethod
    def _build(cls):
        import urllib.parse

        from arq.connections import RedisSettings as ARedisSettings

        parsed = urllib.parse.urlparse(settings.REDIS_URL)
        cls.redis_settings = ARedisSettings(
            host=parsed.hostname or "localhost",
            port=parsed.port or 6379,
            database=int(parsed.path.lstrip("/") or 0),
        )
        return cls


WorkerSettings._build()
