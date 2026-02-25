"""Settings router — /settings/api-keys and /settings/defaults."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import ApiKeyCreate, ok
from app.services.settings import (
    create_api_key,
    delete_api_key,
    get_defaults,
    list_api_keys,
    update_defaults,
)

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/api-keys")
async def get_api_keys(db: AsyncSession = Depends(get_db)):
    keys = await list_api_keys(db)
    return ok(keys)


@router.post("/api-keys", status_code=201)
async def post_api_key(
    body: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
):
    key = await create_api_key(db, body)
    return ok(key, message="API key stored")


@router.delete("/api-keys/{key_id}")
async def delete_api_key_route(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_api_key(db, key_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="API key not found")
    return ok(None, message="API key deleted")


@router.get("/defaults")
async def get_defaults_route(db: AsyncSession = Depends(get_db)):
    defaults = await get_defaults(db)
    return ok(defaults)


@router.put("/defaults")
async def put_defaults(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    # body is a free-form dict of key -> value strings
    string_body = {k: str(v) for k, v in body.items()}
    defaults = await update_defaults(db, string_body)
    return ok(defaults)
