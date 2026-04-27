"""Tests for dockerized runtime execution helper."""

from pathlib import Path

import pytest

from app.evaluation.docker_runtime import execute_dockerized_run


class _FakeContainer:
    def __init__(self, work_dir: Path, *, status_code: int = 0, logs_text: str = ""):
        self._work_dir = work_dir
        self._status_code = status_code
        self._logs_text = logs_text

    def wait(self, timeout=None):
        if self._status_code == 0:
            output_path = self._work_dir / "output.json"
            output_path.write_text(
                '{"answer":"ok","retrieved":[],"retrieved_count":1,"relevant_count":1,'
                '"relevant_retrieved":1,"first_relevant_rank":1,"token_usage":100,'
                '"cost_usd":0.01,"hallucination":0.1,"latency_ms":100.0,'
                '"execution":{"runtime":"dockerized"}}',
                encoding="utf-8",
            )
        return {"StatusCode": self._status_code}

    def logs(self, stdout=True, stderr=True):
        return self._logs_text.encode("utf-8")

    def remove(self, force=False):
        return None

    def kill(self):
        return None


class _FakeDockerClient:
    def __init__(self, *, status_code: int = 0, logs_text: str = ""):
        self._status_code = status_code
        self._logs_text = logs_text
        self.containers = self

    def run(self, image, command, detach, working_dir, volumes, environment):
        host_path = next(iter(volumes.keys()))
        return _FakeContainer(
            Path(host_path), status_code=self._status_code, logs_text=self._logs_text
        )

    def close(self):
        return None


def test_execute_dockerized_run_success(monkeypatch):
    import docker

    monkeypatch.setattr(docker, "from_env", lambda: _FakeDockerClient())

    result = execute_dockerized_run(
        run_id="abc",
        system_name="System",
        nodes=[{"id": "n1", "type": "document_loader"}],
        edges=[],
        prompt_input="hello",
        env_vars={"OPENAI_API_KEY": "x"},
    )

    assert result["answer"] == "ok"
    assert result["execution"]["runtime"] == "dockerized"


def test_execute_dockerized_run_non_zero_exit(monkeypatch):
    import docker

    monkeypatch.setattr(
        docker,
        "from_env",
        lambda: _FakeDockerClient(status_code=2, logs_text="boom"),
    )

    with pytest.raises(RuntimeError, match="failed with status 2"):
        execute_dockerized_run(
            run_id="abc",
            system_name="System",
            nodes=[{"id": "n1", "type": "document_loader"}],
            edges=[],
            prompt_input="hello",
            env_vars={},
        )
