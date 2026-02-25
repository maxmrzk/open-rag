"""Service layer for Evaluation Run operations."""

import uuid
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import EvaluationRun, SystemDefinition


def _run_to_dict(run: EvaluationRun) -> dict:
    return {
        "id": run.id,
        "systemId": run.system_id,
        "systemName": run.system_name,
        "metrics": {
            "precision": run.metric_precision or 0.0,
            "recall": run.metric_recall or 0.0,
            "mrr": run.metric_mrr or 0.0,
            "latencyMs": run.metric_latency_ms or 0.0,
            "tokenUsage": run.metric_token_usage or 0,
            "costUsd": run.metric_cost_usd or 0.0,
            "hallucinationScore": run.metric_hallucination or 0.0,
        },
        "configSnapshot": run.config_snapshot or {},
        "status": run.status,
        "createdAt": run.created_at,
    }


async def list_runs(
    db: AsyncSession,
    system_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    offset = (page - 1) * page_size

    total_result = await db.execute(
        select(func.count(EvaluationRun.id)).where(EvaluationRun.system_id == system_id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(EvaluationRun)
        .where(EvaluationRun.system_id == system_id)
        .order_by(EvaluationRun.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    runs = result.scalars().all()
    return [_run_to_dict(r) for r in runs], total


async def get_run(db: AsyncSession, run_id: uuid.UUID) -> Optional[dict]:
    result = await db.execute(select(EvaluationRun).where(EvaluationRun.id == run_id))
    run = result.scalar_one_or_none()
    if run is None:
        return None
    return _run_to_dict(run)


async def create_run(db: AsyncSession, system_id: uuid.UUID) -> Optional[dict]:
    """Create a new evaluation run and enqueue a background job."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(SystemDefinition)
        .where(SystemDefinition.id == system_id)
        .options(selectinload(SystemDefinition.nodes))
    )
    system = result.scalar_one_or_none()
    if system is None:
        return None

    # Build config snapshot from current node configs
    config_snapshot: dict = {node.id: node.config for node in system.nodes}

    run = EvaluationRun(
        system_id=system_id,
        system_name=system.name,
        status="running",
        config_snapshot=config_snapshot,
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)

    run_dict = _run_to_dict(run)

    # Enqueue background job (best-effort — don't fail the HTTP response if Redis is down)
    try:
        from arq import create_pool
        from arq.connections import RedisSettings
        import urllib.parse
        from app.core.config import get_settings

        settings = get_settings()
        parsed = urllib.parse.urlparse(settings.REDIS_URL)
        redis_settings = RedisSettings(
            host=parsed.hostname or "localhost",
            port=parsed.port or 6379,
            database=int(parsed.path.lstrip("/") or 0),
        )
        pool = await create_pool(redis_settings)
        await pool.enqueue_job("evaluate_system", str(run.id))
        await pool.aclose()
    except Exception:
        pass  # Worker is optional; frontend polls status

    return run_dict


async def get_runs_comparison(
    db: AsyncSession,
    baseline_id: uuid.UUID,
    compared_ids: list[uuid.UUID],
) -> list[dict]:
    all_ids = [baseline_id] + compared_ids
    result = await db.execute(
        select(EvaluationRun)
        .where(EvaluationRun.id.in_(all_ids), EvaluationRun.status == "completed")
        .order_by(EvaluationRun.created_at.desc())
    )
    runs_by_id = {r.id: r for r in result.scalars().all()}

    ordered = []
    for rid in all_ids:
        if rid in runs_by_id:
            ordered.append(_run_to_dict(runs_by_id[rid]))
    return ordered
