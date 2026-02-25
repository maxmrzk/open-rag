"""Service layer for System Definition CRUD operations."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import SystemDefinition, SystemEdge, SystemNode
from app.schemas.schemas import SystemCreate, SystemNodeOut, SystemEdgeOut, SystemUpdate


def _system_to_dict(system: SystemDefinition) -> dict:
    return {
        "id": system.id,
        "projectId": system.project_id,
        "name": system.name,
        "version": system.version,
        "nodes": [
            {
                "id": n.id,
                "type": n.type,
                "name": n.name,
                "config": n.config or {},
                "position": {"x": n.position_x, "y": n.position_y},
                "codeComponentId": str(n.code_component_id)
                if n.code_component_id
                else None,
                "inputs": n.inputs or [],
                "outputs": n.outputs or [],
            }
            for n in system.nodes
        ],
        "edges": [
            {"id": e.id, "source": e.source, "target": e.target} for e in system.edges
        ],
        "createdAt": system.created_at,
        "updatedAt": system.updated_at,
    }


async def list_systems(
    db: AsyncSession,
    project_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    offset = (page - 1) * page_size

    total_result = await db.execute(
        select(func.count(SystemDefinition.id)).where(
            SystemDefinition.project_id == project_id
        )
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(SystemDefinition)
        .where(SystemDefinition.project_id == project_id)
        .options(
            selectinload(SystemDefinition.nodes), selectinload(SystemDefinition.edges)
        )
        .order_by(SystemDefinition.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    systems = result.scalars().all()
    return [_system_to_dict(s) for s in systems], total


async def get_system(db: AsyncSession, system_id: uuid.UUID) -> Optional[dict]:
    result = await db.execute(
        select(SystemDefinition)
        .where(SystemDefinition.id == system_id)
        .options(
            selectinload(SystemDefinition.nodes), selectinload(SystemDefinition.edges)
        )
    )
    system = result.scalar_one_or_none()
    if system is None:
        return None
    return _system_to_dict(system)


async def create_system(
    db: AsyncSession, project_id: uuid.UUID, data: SystemCreate
) -> dict:
    system = SystemDefinition(
        project_id=project_id,
        name=data.name,
        version=1,
    )
    db.add(system)
    await db.flush()

    for node_in in data.nodes:
        node = SystemNode(
            id=node_in.id,
            system_id=system.id,
            type=node_in.type,
            name=node_in.name,
            config=node_in.config,
            position_x=node_in.position.x,
            position_y=node_in.position.y,
            code_component_id=uuid.UUID(node_in.codeComponentId)
            if node_in.codeComponentId
            else None,
            inputs=node_in.inputs,
            outputs=node_in.outputs,
        )
        db.add(node)

    for edge_in in data.edges:
        edge = SystemEdge(
            id=edge_in.id,
            system_id=system.id,
            source=edge_in.source,
            target=edge_in.target,
        )
        db.add(edge)

    await db.flush()

    full = await get_system(db, system.id)
    return full  # type: ignore[return-value]


async def update_system(
    db: AsyncSession, system_id: uuid.UUID, data: SystemUpdate
) -> Optional[dict]:
    result = await db.execute(
        select(SystemDefinition).where(SystemDefinition.id == system_id)
    )
    system = result.scalar_one_or_none()
    if system is None:
        return None

    system.name = data.name
    system.version += 1
    system.updated_at = datetime.now(timezone.utc)

    # Delete and re-insert nodes + edges (transactional replace)
    await db.execute(delete(SystemNode).where(SystemNode.system_id == system_id))
    await db.execute(delete(SystemEdge).where(SystemEdge.system_id == system_id))

    for node_in in data.nodes:
        node = SystemNode(
            id=node_in.id,
            system_id=system_id,
            type=node_in.type,
            name=node_in.name,
            config=node_in.config,
            position_x=node_in.position.x,
            position_y=node_in.position.y,
            code_component_id=uuid.UUID(node_in.codeComponentId)
            if node_in.codeComponentId
            else None,
            inputs=node_in.inputs,
            outputs=node_in.outputs,
        )
        db.add(node)

    for edge_in in data.edges:
        edge = SystemEdge(
            id=edge_in.id,
            system_id=system_id,
            source=edge_in.source,
            target=edge_in.target,
        )
        db.add(edge)

    await db.flush()
    return await get_system(db, system_id)


async def delete_system(db: AsyncSession, system_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(SystemDefinition).where(SystemDefinition.id == system_id)
    )
    system = result.scalar_one_or_none()
    if system is None:
        return False
    await db.delete(system)
    return True
