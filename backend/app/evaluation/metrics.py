"""Metrics computation helpers for evaluation outputs."""


def _safe_div(n: float, d: float) -> float:
    if d == 0:
        return 0.0
    return n / d


def compute_metrics(payload: dict, latency_ms: float, token_usage: int, cost_usd: float) -> dict:
    retrieved = int(payload.get("retrieved_count", 0))
    relevant = int(payload.get("relevant_count", 0))
    relevant_retrieved = int(payload.get("relevant_retrieved", 0))
    first_relevant_rank = int(payload.get("first_relevant_rank", 0))
    hallucination = float(payload.get("hallucination", 0.0))

    precision = _safe_div(relevant_retrieved, retrieved)
    recall = _safe_div(relevant_retrieved, relevant)
    mrr = _safe_div(1.0, first_relevant_rank) if first_relevant_rank > 0 else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "mrr": round(mrr, 4),
        "latencyMs": round(latency_ms, 1),
        "tokenUsage": max(0, int(token_usage)),
        "costUsd": round(max(0.0, float(cost_usd)), 6),
        "hallucinationScore": round(min(1.0, max(0.0, hallucination)), 4),
    }
