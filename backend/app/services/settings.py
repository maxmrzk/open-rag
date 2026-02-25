"""Service layer for Settings (API keys + default configs)."""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decrypt_value, encrypt_value, mask_value
from app.models.models import ApiKeySecret, DefaultConfig
from app.schemas.schemas import ApiKeyCreate


# ---------------------------------------------------------------------------
# API Key Secrets
# ---------------------------------------------------------------------------


async def list_api_keys(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(ApiKeySecret).order_by(ApiKeySecret.created_at))
    keys = result.scalars().all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "value": mask_value(decrypt_value(k.value_enc)),
            "lastUsed": k.last_used,
        }
        for k in keys
    ]


async def create_api_key(db: AsyncSession, data: ApiKeyCreate) -> dict:
    encrypted = encrypt_value(data.value)
    key = ApiKeySecret(name=data.name, value_enc=encrypted)
    db.add(key)
    await db.flush()
    await db.refresh(key)
    return {
        "id": key.id,
        "name": key.name,
        "value": mask_value(data.value),
        "lastUsed": key.last_used,
    }


async def delete_api_key(db: AsyncSession, key_id: uuid.UUID) -> bool:
    result = await db.execute(select(ApiKeySecret).where(ApiKeySecret.id == key_id))
    key = result.scalar_one_or_none()
    if key is None:
        return False
    await db.delete(key)
    return True


# ---------------------------------------------------------------------------
# Default Configs
# ---------------------------------------------------------------------------

_DEFAULT_CONFIG_KEYS = {
    "chunkSize": "512",
    "chunkOverlap": "64",
    "embeddingModel": "text-embedding-3-large",
    "llmModel": "gpt-4o",
    "temperature": "0.1",
    "topK": "10",
}


async def get_defaults(db: AsyncSession) -> dict:
    result = await db.execute(select(DefaultConfig))
    rows = {r.key: r.value for r in result.scalars().all()}
    return {k: rows.get(k, v) for k, v in _DEFAULT_CONFIG_KEYS.items()}


async def update_defaults(db: AsyncSession, updates: dict[str, str]) -> dict:
    for key, value in updates.items():
        result = await db.execute(select(DefaultConfig).where(DefaultConfig.key == key))
        cfg = result.scalar_one_or_none()
        if cfg is None:
            db.add(DefaultConfig(key=key, value=value))
        else:
            cfg.value = value
    await db.flush()
    return await get_defaults(db)
