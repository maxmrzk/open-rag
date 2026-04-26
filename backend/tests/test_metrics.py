"""Tests for metric computation helpers."""

from app.evaluation.metrics import compute_metrics


def test_compute_metrics_basic_values():
    payload = {
        "retrieved_count": 10,
        "relevant_count": 8,
        "relevant_retrieved": 6,
        "first_relevant_rank": 2,
        "hallucination": 0.12,
    }

    result = compute_metrics(payload, latency_ms=210.4, token_usage=1234, cost_usd=0.0185)

    assert result["precision"] == 0.6
    assert result["recall"] == 0.75
    assert result["mrr"] == 0.5
    assert result["latencyMs"] == 210.4
    assert result["tokenUsage"] == 1234
    assert result["costUsd"] == 0.0185
    assert result["hallucinationScore"] == 0.12


def test_compute_metrics_zero_division_safe():
    result = compute_metrics({}, latency_ms=0.0, token_usage=0, cost_usd=0.0)
    assert result["precision"] == 0.0
    assert result["recall"] == 0.0
    assert result["mrr"] == 0.0


def test_compute_metrics_hallucination_bounds():
    payload = {
        "retrieved_count": 1,
        "relevant_count": 1,
        "relevant_retrieved": 1,
        "first_relevant_rank": 1,
        "hallucination": 2.3,
    }
    result = compute_metrics(payload, latency_ms=1.0, token_usage=1, cost_usd=0.0)
    assert result["hallucinationScore"] == 1.0
