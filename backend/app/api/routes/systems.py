"""Systems router — CRUD for /projects/{id}/systems and /systems/{id}."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import Pagination, SystemCreate, SystemUpdate, ok
from app.services.systems import (
    create_system,
    delete_system,
    get_system,
    list_all_systems,
    list_systems,
    update_system,
)

router = APIRouter(tags=["systems"])


# ---------------------------------------------------------------------------
# Global system listing (all systems across projects — for selectors)
# ---------------------------------------------------------------------------


@router.get("/systems")
async def get_all_systems(
    page: int = Query(1, ge=1),
    pageSize: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    systems, total = await list_all_systems(db, page=page, page_size=pageSize)
    pagination = Pagination(page=page, pageSize=pageSize, total=total)
    return ok(systems, pagination=pagination)


# ---------------------------------------------------------------------------
# Project-scoped system endpoints
# ---------------------------------------------------------------------------


@router.get("/projects/{project_id}/systems")
async def get_systems(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    systems, total = await list_systems(db, project_id, page=page, page_size=pageSize)
    pagination = Pagination(page=page, pageSize=pageSize, total=total)
    return ok(systems, pagination=pagination)


@router.post("/projects/{project_id}/systems", status_code=201)
async def post_system(
    project_id: uuid.UUID,
    body: SystemCreate,
    db: AsyncSession = Depends(get_db),
):
    system = await create_system(db, project_id, body)
    return ok(system, message="System created")


# ---------------------------------------------------------------------------
# Individual system endpoints
# ---------------------------------------------------------------------------


@router.get("/systems/{system_id}")
async def get_system_route(
    system_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    system = await get_system(db, system_id)
    if system is None:
        raise HTTPException(status_code=404, detail="System not found")
    return ok(system)


@router.put("/systems/{system_id}")
async def put_system(
    system_id: uuid.UUID,
    body: SystemUpdate,
    db: AsyncSession = Depends(get_db),
):
    system = await update_system(db, system_id, body)
    if system is None:
        raise HTTPException(status_code=404, detail="System not found")
    return ok(system)


@router.delete("/systems/{system_id}")
async def delete_system_route(
    system_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_system(db, system_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="System not found")
    return ok(None, message="System deleted")
