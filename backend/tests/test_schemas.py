"""Tests for app.schemas.schemas — Pydantic schema validation and envelope helpers."""

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.schemas import (
    ApiResponse,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    MetricsOut,
    EvaluationRunOut,
    ApiKeyCreate,
    ComponentCreate,
    SystemCreate,
    SystemNodeIn,
    SystemEdgeIn,
    Pagination,
    ok,
    err,
)


# ---------------------------------------------------------------------------
# Envelope helpers
# ---------------------------------------------------------------------------


class TestOkHelper:
    def test_ok_minimal(self):
        result = ok({"id": "abc"})
        assert result["success"] is True
        assert result["data"] == {"id": "abc"}
        assert "message" not in result
        assert "pagination" not in result

    def test_ok_with_message(self):
        result = ok(None, message="created")
        assert result["message"] == "created"

    def test_ok_with_pagination(self):
        pag = Pagination(page=2, pageSize=10, total=55)
        result = ok([], pagination=pag)
        assert result["pagination"]["page"] == 2
        assert result["pagination"]["total"] == 55

    def test_err_helper(self):
        result = err("not found")
        assert result["success"] is False
        assert result["message"] == "not found"
        assert result["data"] is None


# ---------------------------------------------------------------------------
# ProjectCreate / ProjectUpdate
# ---------------------------------------------------------------------------


class TestProjectCreate:
    def test_valid(self):
        p = ProjectCreate(name="My Project")
        assert p.name == "My Project"
        assert p.description is None

    def test_name_empty_raises(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="")

    def test_name_too_long_raises(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="x" * 256)


class TestProjectUpdate:
    def test_all_optional(self):
        p = ProjectUpdate()
        assert p.name is None
        assert p.description is None

    def test_valid_partial(self):
        p = ProjectUpdate(name="New Name")
        assert p.name == "New Name"


# ---------------------------------------------------------------------------
# ProjectOut
# ---------------------------------------------------------------------------


class TestProjectOut:
    def _make(self, **kwargs):
        defaults = {
            "id": uuid.uuid4(),
            "name": "Test",
            "description": None,
            "createdAt": datetime.now(timezone.utc),
            "systemCount": 0,
            "runCount": 0,
        }
        defaults.update(kwargs)
        return ProjectOut(**defaults)

    def test_valid(self):
        p = self._make()
        assert p.systemCount == 0

    def test_negative_counts_raise(self):
        with pytest.raises(ValidationError):
            self._make(systemCount=-1)


# ---------------------------------------------------------------------------
# MetricsOut
# ---------------------------------------------------------------------------


class TestMetricsOut:
    def test_defaults_are_zeros(self):
        m = MetricsOut()
        assert m.precision == 0.0
        assert m.recall == 0.0
        assert m.tokenUsage == 0

    def test_explicit_values(self):
        m = MetricsOut(
            precision=0.9,
            recall=0.8,
            mrr=0.7,
            latencyMs=120.5,
            tokenUsage=500,
            costUsd=0.02,
            hallucinationScore=0.05,
        )
        assert m.precision == 0.9
        assert m.tokenUsage == 500


# ---------------------------------------------------------------------------
# SystemCreate / SystemNodeIn
# ---------------------------------------------------------------------------


class TestSystemCreate:
    def test_empty_nodes_and_edges(self):
        s = SystemCreate(name="RAG v1")
        assert s.nodes == []
        assert s.edges == []

    def test_with_node(self):
        node = SystemNodeIn(
            id="node-1",
            type="chunker",
            name="Chunker",
            config={"chunkSize": 512},
            position={"x": 100.0, "y": 200.0},
        )
        s = SystemCreate(name="RAG v1", nodes=[node])
        assert len(s.nodes) == 1
        assert s.nodes[0].config["chunkSize"] == 512

    def test_node_defaults(self):
        node = SystemNodeIn(
            id="n1",
            type="llm",
            name="LLM",
            config={},
            position={"x": 0, "y": 0},
        )
        assert node.inputs == []
        assert node.outputs == []
        assert node.codeComponentId is None


# ---------------------------------------------------------------------------
# ApiKeyCreate
# ---------------------------------------------------------------------------


class TestApiKeyCreate:
    def test_valid(self):
        k = ApiKeyCreate(name="OpenAI", value="sk-abc123")
        assert k.name == "OpenAI"

    def test_empty_name_raises(self):
        with pytest.raises(ValidationError):
            ApiKeyCreate(name="", value="secret")

    def test_empty_value_raises(self):
        with pytest.raises(ValidationError):
            ApiKeyCreate(name="key", value="")
