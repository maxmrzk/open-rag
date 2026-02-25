"""Docker export generation — deterministic Dockerfile + docker-compose output."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import SystemDefinition

_DOCKERFILE_TEMPLATE = """\
# ============================================
# RAG System Builder — Auto-Generated Dockerfile
# Generated from: {system_name}
# ============================================
FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \\
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
"""


def _build_compose(system_name: str, has_qdrant: bool, has_neo4j: bool, env_vars: list[str]) -> str:
    env_lines = "\n".join(f"      - {v}=${{{v}}}" for v in env_vars)

    depends = []
    services_extra = ""

    if has_qdrant:
        depends.append("qdrant")
        services_extra += """
  qdrant:
    image: qdrant/qdrant:v1.8.0
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped
    networks:
      - rag-network
"""

    if has_neo4j:
        depends.append("neo4j")
        services_extra += """
  neo4j:
    image: neo4j:5.15-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
      - NEO4J_PLUGINS=["apoc"]
    volumes:
      - neo4j_data:/data
    restart: unless-stopped
    networks:
      - rag-network
"""

    depends_block = ""
    if depends:
        depends_block = "    depends_on:\n" + "".join(f"      - {d}\n" for d in depends)

    volumes_block = ""
    volume_names = []
    if has_qdrant:
        volume_names.append("qdrant_data:")
    if has_neo4j:
        volume_names.append("neo4j_data:")
    if volume_names:
        volumes_block = "volumes:\n" + "".join(f"  {v}\n" for v in volume_names) + "\n"

    compose = f"""\
# ============================================
# RAG System — docker-compose.yml
# Generated from: {system_name}
# ============================================
version: "3.9"

services:
  rag-api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
{env_lines if env_lines else "      []"}
{depends_block}    restart: unless-stopped
    networks:
      - rag-network
{services_extra}
{volumes_block}networks:
  rag-network:
    driver: bridge
"""
    return compose


async def generate_docker_export(db: AsyncSession, system_id: uuid.UUID) -> dict | None:
    result = await db.execute(
        select(SystemDefinition)
        .where(SystemDefinition.id == system_id)
        .options(selectinload(SystemDefinition.nodes))
    )
    system = result.scalar_one_or_none()
    if system is None:
        return None

    has_qdrant = False
    has_neo4j = False
    env_vars: list[str] = []

    for node in system.nodes:
        cfg = node.config or {}
        if node.type == "vector_store":
            if cfg.get("provider") == "qdrant":
                has_qdrant = True
                env_vars += ["QDRANT_HOST", "QDRANT_PORT"]
        elif node.type == "graph_store":
            if cfg.get("provider") == "neo4j":
                has_neo4j = True
                env_vars += ["NEO4J_URI", "NEO4J_USER", "NEO4J_PASSWORD"]
        elif node.type in ("embedder", "llm"):
            api_key_env = cfg.get("apiKeyEnv")
            if api_key_env and api_key_env not in env_vars:
                env_vars.append(api_key_env)
            provider = cfg.get("provider", "")
            if provider == "openai" and "OPENAI_API_KEY" not in env_vars:
                env_vars.append("OPENAI_API_KEY")

    # Deduplicate while preserving order
    seen: set[str] = set()
    deduped = []
    for v in env_vars:
        if v not in seen:
            seen.add(v)
            deduped.append(v)

    dockerfile = _DOCKERFILE_TEMPLATE.format(system_name=system.name)
    docker_compose = _build_compose(system.name, has_qdrant, has_neo4j, deduped)

    return {"dockerfile": dockerfile, "dockerCompose": docker_compose}
