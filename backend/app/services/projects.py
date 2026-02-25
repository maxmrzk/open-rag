"""Service layer for Project CRUD operations."""

import uuid
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import EvaluationRun, Project, SystemDefinition
from app.schemas.schemas import ProjectCreate, ProjectUpdate


async def list_projects(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    offset = (page - 1) * page_size

    # Count total
    total_result = await db.execute(select(func.count(Project.id)))
    total = total_result.scalar_one()

    # Fetch projects with computed counts via correlated subqueries
    stmt = (
        select(
            Project,
            select(func.count(SystemDefinition.id))
            .where(SystemDefinition.project_id == Project.id)
            .correlate(Project)
            .scalar_subquery()
            .label("system_count"),
            select(func.count(EvaluationRun.id))
            .join(SystemDefinition, EvaluationRun.system_id == SystemDefinition.id)
            .where(SystemDefinition.project_id == Project.id)
            .correlate(Project)
            .scalar_subquery()
            .label("run_count"),
        )
        .order_by(Project.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )

    result = await db.execute(stmt)
    rows = result.all()

    projects = []
    for row in rows:
        project, system_count, run_count = row
        projects.append(
            {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "createdAt": project.created_at,
                "systemCount": system_count or 0,
                "runCount": run_count or 0,
            }
        )

    return projects, total


async def get_project(db: AsyncSession, project_id: uuid.UUID) -> Optional[dict]:
    stmt = select(
        Project,
        select(func.count(SystemDefinition.id))
        .where(SystemDefinition.project_id == Project.id)
        .correlate(Project)
        .scalar_subquery()
        .label("system_count"),
        select(func.count(EvaluationRun.id))
        .join(SystemDefinition, EvaluationRun.system_id == SystemDefinition.id)
        .where(SystemDefinition.project_id == Project.id)
        .correlate(Project)
        .scalar_subquery()
        .label("run_count"),
    ).where(Project.id == project_id)

    result = await db.execute(stmt)
    row = result.one_or_none()
    if row is None:
        return None

    project, system_count, run_count = row
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "createdAt": project.created_at,
        "systemCount": system_count or 0,
        "runCount": run_count or 0,
    }


async def create_project(db: AsyncSession, data: ProjectCreate) -> dict:
    project = Project(name=data.name, description=data.description)
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "createdAt": project.created_at,
        "systemCount": 0,
        "runCount": 0,
    }


async def update_project(
    db: AsyncSession, project_id: uuid.UUID, data: ProjectUpdate
) -> Optional[dict]:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        return None

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description

    await db.flush()
    await db.refresh(project)

    full = await get_project(db, project_id)
    return full


async def delete_project(db: AsyncSession, project_id: uuid.UUID) -> bool:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        return False
    await db.delete(project)
    return True
