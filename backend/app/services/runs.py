"""Service layer for Evaluation Run operations."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import EvaluationRun, Project, SystemDefinition


def _run_to_dict(
    run: EvaluationRun,
    project_id: uuid.UUID | None = None,
    project_name: str | None = None,
) -> dict:
    snapshot = run.config_snapshot or {}
    return {
        "id": run.id,
        "systemId": run.system_id,
        "systemName": run.system_name,
        "projectId": project_id or snapshot.get("_project_id"),
        "projectName": project_name or snapshot.get("_project_name", ""),
        "promptInput": snapshot.get("_prompt_input"),
        "metrics": {
            "precision": run.metric_precision or 0.0,
            "recall": run.metric_recall or 0.0,
            "mrr": run.metric_mrr or 0.0,
            "latencyMs": run.metric_latency_ms or 0.0,
            "tokenUsage": run.metric_token_usage or 0,
            "costUsd": run.metric_cost_usd or 0.0,
            "hallucinationScore": run.metric_hallucination or 0.0,
        },
        "configSnapshot": {k: v for k, v in snapshot.items() if not k.startswith("_")},
        "status": run.status,
        "createdAt": run.created_at,
    }


def _runs_with_project_stmt(extra_where=None):
    """SELECT joining EvaluationRun → SystemDefinition → Project."""
    stmt = (
        select(EvaluationRun, SystemDefinition.project_id, Project.name.label("project_name"))
        .join(SystemDefinition, EvaluationRun.system_id == SystemDefinition.id)
        .join(Project, SystemDefinition.project_id == Project.id)
    )
    if extra_where is not None:
        stmt = stmt.where(extra_where)
    return stmt


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

    stmt = (
        _runs_with_project_stmt(EvaluationRun.system_id == system_id)
        .order_by(EvaluationRun.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [_run_to_dict(row[0], row[1], row[2]) for row in rows], total


async def list_all_runs(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 100,
) -> tuple[list[dict], int]:
    """All runs across all systems/projects."""
    offset = (page - 1) * page_size

    total_result = await db.execute(select(func.count(EvaluationRun.id)))
    total = total_result.scalar_one()

    stmt = (
        _runs_with_project_stmt()
        .order_by(EvaluationRun.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [_run_to_dict(row[0], row[1], row[2]) for row in rows], total


async def list_project_runs(
    db: AsyncSession,
    project_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[dict], int]:
    """All runs for a given project."""
    offset = (page - 1) * page_size

    total_result = await db.execute(
        select(func.count(EvaluationRun.id))
        .join(SystemDefinition, EvaluationRun.system_id == SystemDefinition.id)
        .where(SystemDefinition.project_id == project_id)
    )
    total = total_result.scalar_one()

    stmt = (
        _runs_with_project_stmt(SystemDefinition.project_id == project_id)
        .order_by(EvaluationRun.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [_run_to_dict(row[0], row[1], row[2]) for row in rows], total


async def get_run(db: AsyncSession, run_id: uuid.UUID) -> dict | None:
    stmt = _runs_with_project_stmt(EvaluationRun.id == run_id)
    result = await db.execute(stmt)
    row = result.one_or_none()
    if row is None:
        return None
    return _run_to_dict(row[0], row[1], row[2])


async def create_run(
    db: AsyncSession,
    system_id: uuid.UUID,
    prompt_input: str | None = None,
) -> dict | None:
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

    # Fetch project info
    proj_result = await db.execute(select(Project).where(Project.id == system.project_id))
    project = proj_result.scalar_one_or_none()
    project_id = project.id if project else None
    project_name = project.name if project else ""

    # Build config snapshot (internal _ keys stripped from public view)
    config_snapshot: dict = {node.id: node.config for node in system.nodes}
    config_snapshot["_project_id"] = str(project_id) if project_id else None
    config_snapshot["_project_name"] = project_name
    if prompt_input:
        config_snapshot["_prompt_input"] = prompt_input

    run = EvaluationRun(
        system_id=system_id,
        system_name=system.name,
        status="running",
        config_snapshot=config_snapshot,
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)

    run_dict = _run_to_dict(run, project_id, project_name)

    # Enqueue background job (best-effort — don't fail the HTTP response if Redis is down)
    try:
        import urllib.parse

        from arq import create_pool
        from arq.connections import RedisSettings

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
    stmt = _runs_with_project_stmt(
        EvaluationRun.id.in_(all_ids) & (EvaluationRun.status == "completed")
    ).order_by(EvaluationRun.created_at.desc())

    result = await db.execute(stmt)
    rows_by_id = {row[0].id: row for row in result.all()}

    ordered = []
    for rid in all_ids:
        if rid in rows_by_id:
            row = rows_by_id[rid]
            ordered.append(_run_to_dict(row[0], row[1], row[2]))
    return ordered
