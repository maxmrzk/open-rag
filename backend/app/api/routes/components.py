"""Component Library router — /component-library."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import ComponentCreate, ComponentUpdate, Pagination, ok
from app.services.components import (
    create_component,
    delete_component,
    get_component,
    list_components,
    update_component,
)

router = APIRouter(prefix="/component-library", tags=["components"])


@router.get("")
async def get_components(
    nodeType: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    comps, total = await list_components(
        db,
        node_type=nodeType,
        provider=provider,
        search=search,
        page=page,
        page_size=pageSize,
    )
    pagination = Pagination(page=page, pageSize=pageSize, total=total)
    return ok(comps, pagination=pagination)


@router.post("", status_code=201)
async def post_component(
    body: ComponentCreate,
    db: AsyncSession = Depends(get_db),
):
    comp = await create_component(db, body)
    return ok(comp, message="Component created")


@router.get("/{comp_id}")
async def get_component_route(
    comp_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    comp = await get_component(db, comp_id)
    if comp is None:
        raise HTTPException(status_code=404, detail="Component not found")
    return ok(comp)


@router.put("/{comp_id}")
async def put_component(
    comp_id: uuid.UUID,
    body: ComponentUpdate,
    db: AsyncSession = Depends(get_db),
):
    comp = await update_component(db, comp_id, body)
    if comp is None:
        raise HTTPException(
            status_code=404, detail="Component not found or is a built-in"
        )
    return ok(comp)


@router.delete("/{comp_id}")
async def delete_component_route(
    comp_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await delete_component(db, comp_id)
    if result is False:
        raise HTTPException(status_code=404, detail="Component not found")
    if result == "builtin":
        raise HTTPException(status_code=403, detail="Cannot delete built-in components")
    return ok(None, message="Component deleted")
