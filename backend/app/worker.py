"""ARQ background worker — processes evaluation run jobs.

Start with:
    arq app.worker.WorkerSettings
"""

import asyncio
import random
import uuid

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.config import get_settings
from app.models.models import EvaluationRun, SystemDefinition

settings = get_settings()


async def evaluate_system(ctx: dict, run_id: str) -> None:
    """Execute the RAG pipeline for a run and write back metrics.

    In production this would:
      1. Load the system definition
      2. Decrypt API keys from api_key_secrets
      3. Run document_loader → chunker → embedder → vector_store → retriever →
         reranker → llm → evaluation nodes
      4. Write real metrics back to the DB

    For now, simulates a 5-second pipeline with random plausible metrics.
    """
    run_uuid = uuid.UUID(run_id)

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(EvaluationRun).where(EvaluationRun.id == run_uuid)
            )
            run = result.scalar_one_or_none()
            if run is None:
                return

            # Simulate pipeline execution time
            await asyncio.sleep(5)

            # Write simulated metrics
            run.metric_precision = round(random.uniform(0.70, 0.95), 4)
            run.metric_recall = round(random.uniform(0.65, 0.92), 4)
            run.metric_mrr = round(random.uniform(0.75, 0.95), 4)
            run.metric_latency_ms = round(random.uniform(200, 800), 1)
            run.metric_token_usage = random.randint(8000, 25000)
            run.metric_cost_usd = round(random.uniform(0.01, 0.12), 5)
            run.metric_hallucination = round(random.uniform(0.02, 0.15), 4)
            run.status = "completed"

            await db.commit()

    except Exception as exc:  # noqa: BLE001
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(EvaluationRun).where(EvaluationRun.id == run_uuid)
            )
            run = result.scalar_one_or_none()
            if run:
                run.status = "failed"
                run.error_message = str(exc)
                await db.commit()


class WorkerSettings:
    """ARQ worker configuration."""

    functions = [evaluate_system]
    redis_settings = None  # set dynamically below

    @classmethod
    def _build(cls):
        from arq.connections import RedisSettings as ARedisSettings
        import urllib.parse

        parsed = urllib.parse.urlparse(settings.REDIS_URL)
        cls.redis_settings = ARedisSettings(
            host=parsed.hostname or "localhost",
            port=parsed.port or 6379,
            database=int(parsed.path.lstrip("/") or 0),
        )
        return cls


WorkerSettings._build()
