"""Runs router — /systems/{id}/runs and /runs/{id} and /runs/compare."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import Pagination, ok
from app.services.runs import (
    create_run,
    get_run,
    get_runs_comparison,
    list_runs,
)

router = APIRouter(tags=["runs"])


@router.post("/systems/{system_id}/runs", status_code=202)
async def post_run(
    system_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    run = await create_run(db, system_id)
    if run is None:
        raise HTTPException(status_code=404, detail="System not found")
    return ok(run, message="Evaluation run started")


@router.get("/systems/{system_id}/runs")
async def get_runs(
    system_id: uuid.UUID,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    runs, total = await list_runs(db, system_id, page=page, page_size=pageSize)
    pagination = Pagination(page=page, pageSize=pageSize, total=total)
    return ok(runs, pagination=pagination)


# NOTE: /runs/compare must be declared BEFORE /runs/{run_id} to avoid
# FastAPI routing the literal string "compare" as a UUID path parameter.
@router.get("/runs/compare")
async def compare_runs(
    baseline: uuid.UUID = Query(...),
    compared: list[uuid.UUID] = Query(...),
    db: AsyncSession = Depends(get_db),
):
    runs = await get_runs_comparison(db, baseline, compared)
    return ok(runs)


@router.get("/runs/{run_id}")
async def get_run_route(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    run = await get_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return ok(run)
