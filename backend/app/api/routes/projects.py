"""Projects router — CRUD for /projects and /projects/{projectId}."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import ProjectCreate, ProjectUpdate, Pagination, ok, err
from app.services.projects import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_project,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
async def get_projects(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    projects, total = await list_projects(db, page=page, page_size=pageSize)
    pagination = Pagination(page=page, pageSize=pageSize, total=total)
    return ok(projects, pagination=pagination)


@router.post("", status_code=201)
async def post_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    project = await create_project(db, body)
    return ok(project, message="Project created")


@router.get("/{project_id}")
async def get_project_by_id(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    project = await get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ok(project)


@router.put("/{project_id}")
async def put_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    project = await update_project(db, project_id, body)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ok(project)


@router.delete("/{project_id}")
async def delete_project_route(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return ok(None, message="Project deleted")
