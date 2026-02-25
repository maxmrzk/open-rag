"""Service layer for Component Library CRUD operations."""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import ComponentLibrary
from app.schemas.schemas import ComponentCreate, ComponentUpdate


def _comp_to_dict(c: ComponentLibrary) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "nodeType": c.node_type,
        "provider": c.provider,
        "language": c.language,
        "code": c.code,
        "isDefault": c.is_default,
        "isBuiltin": c.is_builtin,
        "tags": c.tags or [],
        "requirements": c.requirements or [],
        "envVars": c.env_vars or [],
        "projectId": c.project_id,
        "createdAt": c.created_at,
        "updatedAt": c.updated_at,
    }


async def list_components(
    db: AsyncSession,
    node_type: str | None = None,
    provider: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    offset = (page - 1) * page_size

    stmt = select(ComponentLibrary)
    if node_type:
        stmt = stmt.where(ComponentLibrary.node_type == node_type)
    if provider:
        stmt = stmt.where(ComponentLibrary.provider == provider)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                ComponentLibrary.name.ilike(like),
                ComponentLibrary.description.ilike(like),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    result = await db.execute(
        stmt.order_by(ComponentLibrary.is_builtin.desc(), ComponentLibrary.created_at)
        .offset(offset)
        .limit(page_size)
    )
    comps = result.scalars().all()
    return [_comp_to_dict(c) for c in comps], total


async def get_component(db: AsyncSession, comp_id: uuid.UUID) -> dict | None:
    result = await db.execute(select(ComponentLibrary).where(ComponentLibrary.id == comp_id))
    comp = result.scalar_one_or_none()
    if comp is None:
        return None
    return _comp_to_dict(comp)


async def create_component(db: AsyncSession, data: ComponentCreate) -> dict:
    comp = ComponentLibrary(
        name=data.name,
        description=data.description,
        node_type=data.nodeType,
        provider=data.provider,
        language=data.language,
        code=data.code,
        is_default=data.isDefault,
        is_builtin=False,
        tags=data.tags,
        requirements=data.requirements,
        env_vars=data.envVars,
        project_id=data.projectId,
    )
    db.add(comp)
    await db.flush()
    await db.refresh(comp)
    return _comp_to_dict(comp)


async def update_component(
    db: AsyncSession, comp_id: uuid.UUID, data: ComponentUpdate
) -> dict | None:
    result = await db.execute(select(ComponentLibrary).where(ComponentLibrary.id == comp_id))
    comp = result.scalar_one_or_none()
    if comp is None:
        return None
    if comp.is_builtin:
        return None  # Cannot modify built-ins

    if data.name is not None:
        comp.name = data.name
    if data.description is not None:
        comp.description = data.description
    if data.nodeType is not None:
        comp.node_type = data.nodeType
    if data.provider is not None:
        comp.provider = data.provider
    if data.language is not None:
        comp.language = data.language
    if data.code is not None:
        comp.code = data.code
    if data.isDefault is not None:
        comp.is_default = data.isDefault
    if data.tags is not None:
        comp.tags = data.tags
    if data.requirements is not None:
        comp.requirements = data.requirements
    if data.envVars is not None:
        comp.env_vars = data.envVars

    await db.flush()
    await db.refresh(comp)
    return _comp_to_dict(comp)


async def delete_component(db: AsyncSession, comp_id: uuid.UUID) -> bool | str:
    result = await db.execute(select(ComponentLibrary).where(ComponentLibrary.id == comp_id))
    comp = result.scalar_one_or_none()
    if comp is None:
        return False
    if comp.is_builtin:
        return "builtin"
    await db.delete(comp)
    return True
