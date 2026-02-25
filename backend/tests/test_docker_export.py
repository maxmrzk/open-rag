"""Tests for docker export generation helpers (pure functions, no DB)."""

import pytest
from app.services.docker_export import _DOCKERFILE_TEMPLATE, _build_compose


class TestDockerfileTemplate:
    def test_template_has_from_python(self):
        result = _DOCKERFILE_TEMPLATE.format(system_name="My RAG System")
        assert "FROM python:3.11-slim" in result

    def test_template_includes_system_name(self):
        result = _DOCKERFILE_TEMPLATE.format(system_name="Customer Support Bot")
        assert "Customer Support Bot" in result

    def test_template_has_uvicorn_cmd(self):
        result = _DOCKERFILE_TEMPLATE.format(system_name="x")
        assert "uvicorn" in result

    def test_template_exposes_8000(self):
        result = _DOCKERFILE_TEMPLATE.format(system_name="x")
        assert "EXPOSE 8000" in result


class TestBuildCompose:
    def test_minimal_compose(self):
        result = _build_compose("My System", has_qdrant=False, has_neo4j=False, env_vars=[])
        assert "services:" in result
        assert "rag-api:" in result
        assert "My System" in result

    def test_qdrant_service_included(self):
        result = _build_compose("S", has_qdrant=True, has_neo4j=False, env_vars=[])
        assert "qdrant:" in result
        assert "qdrant/qdrant" in result

    def test_neo4j_service_included(self):
        result = _build_compose("S", has_qdrant=False, has_neo4j=True, env_vars=[])
        assert "neo4j:" in result
        assert "neo4j:5.15" in result

    def test_both_services(self):
        result = _build_compose("S", has_qdrant=True, has_neo4j=True, env_vars=[])
        assert "qdrant:" in result
        assert "neo4j:" in result
        assert "depends_on:" in result

    def test_env_vars_in_compose(self):
        result = _build_compose("S", has_qdrant=False, has_neo4j=False, env_vars=["OPENAI_API_KEY"])
        assert "OPENAI_API_KEY" in result

    def test_volumes_declared_when_qdrant(self):
        result = _build_compose("S", has_qdrant=True, has_neo4j=False, env_vars=[])
        assert "qdrant_data:" in result

    def test_volumes_declared_when_neo4j(self):
        result = _build_compose("S", has_qdrant=False, has_neo4j=True, env_vars=[])
        assert "neo4j_data:" in result

    def test_no_extra_volumes_when_not_needed(self):
        result = _build_compose("S", has_qdrant=False, has_neo4j=False, env_vars=[])
        assert "qdrant_data" not in result
        assert "neo4j_data" not in result
