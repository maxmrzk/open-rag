"""Tests for service-layer pure functions (no DB required)."""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from app.services.runs import _run_to_dict
from app.services.systems import _system_to_dict


# ---------------------------------------------------------------------------
# _run_to_dict
# ---------------------------------------------------------------------------


def _make_run(**kwargs):
    """Build a minimal mock EvaluationRun."""
    run = MagicMock()
    run.id = kwargs.get("id", uuid.uuid4())
    run.system_id = kwargs.get("system_id", uuid.uuid4())
    run.system_name = kwargs.get("system_name", "Test System")
    run.status = kwargs.get("status", "running")
    run.config_snapshot = kwargs.get("config_snapshot", {})
    run.created_at = kwargs.get("created_at", datetime.now(timezone.utc))
    # Metric fields default to None (as they are in DB for running runs)
    run.metric_precision = kwargs.get("metric_precision", None)
    run.metric_recall = kwargs.get("metric_recall", None)
    run.metric_mrr = kwargs.get("metric_mrr", None)
    run.metric_latency_ms = kwargs.get("metric_latency_ms", None)
    run.metric_token_usage = kwargs.get("metric_token_usage", None)
    run.metric_cost_usd = kwargs.get("metric_cost_usd", None)
    run.metric_hallucination = kwargs.get("metric_hallucination", None)
    return run


class TestRunToDict:
    def test_running_run_has_zero_metrics(self):
        """A running run with NULL metrics must still return all-zero numeric values."""
        d = _run_to_dict(_make_run(status="running"))
        m = d["metrics"]
        assert m["precision"] == 0.0
        assert m["recall"] == 0.0
        assert m["mrr"] == 0.0
        assert m["latencyMs"] == 0.0
        assert m["tokenUsage"] == 0
        assert m["costUsd"] == 0.0
        assert m["hallucinationScore"] == 0.0

    def test_completed_run_uses_real_values(self):
        run = _make_run(
            status="completed",
            metric_precision=0.92,
            metric_recall=0.88,
            metric_mrr=0.75,
            metric_latency_ms=320.5,
            metric_token_usage=1200,
            metric_cost_usd=0.004,
            metric_hallucination=0.03,
        )
        d = _run_to_dict(run)
        m = d["metrics"]
        assert m["precision"] == 0.92
        assert m["tokenUsage"] == 1200
        assert m["costUsd"] == 0.004

    def test_output_keys(self):
        d = _run_to_dict(_make_run())
        assert set(d.keys()) == {
            "id",
            "systemId",
            "systemName",
            "metrics",
            "configSnapshot",
            "status",
            "createdAt",
        }

    def test_status_preserved(self):
        for status in ("running", "completed", "failed"):
            d = _run_to_dict(_make_run(status=status))
            assert d["status"] == status

    def test_config_snapshot_defaults_to_empty_dict(self):
        run = _make_run(config_snapshot=None)
        d = _run_to_dict(run)
        assert d["configSnapshot"] == {}


# ---------------------------------------------------------------------------
# _system_to_dict
# ---------------------------------------------------------------------------


def _make_node(node_id: str = "node-1", code_component_id=None):
    node = MagicMock()
    node.id = node_id
    node.type = "chunker"
    node.name = "Chunker"
    node.config = {"chunkSize": 512}
    node.position_x = 10.0
    node.position_y = 20.0
    node.code_component_id = code_component_id
    node.inputs = ["doc"]
    node.outputs = ["chunk"]
    return node


def _make_edge(edge_id: str = "edge-1"):
    edge = MagicMock()
    edge.id = edge_id
    edge.source = "node-1"
    edge.target = "node-2"
    return edge


def _make_system(nodes=None, edges=None):
    s = MagicMock()
    s.id = uuid.uuid4()
    s.project_id = uuid.uuid4()
    s.name = "My RAG System"
    s.version = 3
    s.created_at = datetime.now(timezone.utc)
    s.updated_at = datetime.now(timezone.utc)
    s.nodes = nodes or []
    s.edges = edges or []
    return s


class TestSystemToDict:
    def test_output_keys(self):
        d = _system_to_dict(_make_system())
        assert set(d.keys()) == {
            "id",
            "projectId",
            "name",
            "version",
            "nodes",
            "edges",
            "createdAt",
            "updatedAt",
        }

    def test_node_serialisation(self):
        system = _make_system(nodes=[_make_node()])
        d = _system_to_dict(system)
        node = d["nodes"][0]
        assert node["id"] == "node-1"
        assert node["position"] == {"x": 10.0, "y": 20.0}
        assert node["inputs"] == ["doc"]
        assert node["codeComponentId"] is None

    def test_node_with_code_component_id(self):
        cid = uuid.uuid4()
        system = _make_system(nodes=[_make_node(code_component_id=cid)])
        d = _system_to_dict(system)
        assert d["nodes"][0]["codeComponentId"] == str(cid)

    def test_edge_serialisation(self):
        system = _make_system(edges=[_make_edge()])
        d = _system_to_dict(system)
        assert d["edges"][0] == {"id": "edge-1", "source": "node-1", "target": "node-2"}

    def test_empty_system(self):
        d = _system_to_dict(_make_system())
        assert d["nodes"] == []
        assert d["edges"] == []
