"""Tests for evaluation graph normalization and validation."""

import pytest

from app.evaluation.graph import normalize_graph


def test_normalize_graph_topological_order():
    nodes = [
        {"id": "a", "type": "document_loader"},
        {"id": "b", "type": "chunker"},
        {"id": "c", "type": "llm"},
    ]
    edges = [
        {"id": "e1", "source": "a", "target": "b"},
        {"id": "e2", "source": "b", "target": "c"},
    ]

    result = normalize_graph(nodes, edges)
    assert result["topological_order"] == ["a", "b", "c"]


def test_normalize_graph_rejects_unsupported_node():
    nodes = [{"id": "x", "type": "graph_store"}]
    edges = []

    with pytest.raises(ValueError, match="Unsupported node type"):
        normalize_graph(nodes, edges)


def test_normalize_graph_rejects_cycle():
    nodes = [
        {"id": "a", "type": "document_loader"},
        {"id": "b", "type": "chunker"},
    ]
    edges = [
        {"id": "e1", "source": "a", "target": "b"},
        {"id": "e2", "source": "b", "target": "a"},
    ]

    with pytest.raises(ValueError, match="contains a cycle"):
        normalize_graph(nodes, edges)
