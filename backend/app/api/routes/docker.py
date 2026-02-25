"""Docker export router — GET /systems/{id}/export/docker."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import ok
from app.services.docker_export import generate_docker_export

router = APIRouter(tags=["docker"])


@router.get("/systems/{system_id}/export/docker")
async def export_docker(
    system_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await generate_docker_export(db, system_id)
    if result is None:
        raise HTTPException(status_code=404, detail="System not found")
    return ok(result)
