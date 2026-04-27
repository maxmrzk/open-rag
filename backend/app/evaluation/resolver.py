"""Resolve secrets and runtime config for evaluation jobs."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decrypt_value
from app.models.models import ApiKeySecret


async def resolve_api_keys(db: AsyncSession) -> dict[str, str]:
    result = await db.execute(select(ApiKeySecret))
    keys = result.scalars().all()

    resolved: dict[str, str] = {}
    now = datetime.now(UTC)

    for key in keys:
        resolved[key.name] = decrypt_value(key.value_enc)
        key.last_used = now

    return resolved


def env_from_graph(nodes: list[dict], resolved_keys: dict[str, str]) -> dict[str, str]:
    env: dict[str, str] = {}

    for node in nodes:
        cfg = node.get("config") or {}
        candidate_keys = []

        api_key_env = cfg.get("apiKeyEnv")
        if isinstance(api_key_env, str) and api_key_env.strip():
            candidate_keys.append(api_key_env.strip())

        provider = str(cfg.get("provider", "")).lower()
        if provider == "openai":
            candidate_keys.append("OPENAI_API_KEY")
        if provider == "cohere":
            candidate_keys.append("COHERE_API_KEY")
        if provider == "anthropic":
            candidate_keys.append("ANTHROPIC_API_KEY")

        for key_name in candidate_keys:
            if key_name in resolved_keys:
                env[key_name] = resolved_keys[key_name]

    return env
