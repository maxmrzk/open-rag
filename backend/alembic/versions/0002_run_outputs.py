"""Add persisted execution outputs to evaluation runs

Revision ID: 0002_run_outputs
Revises: 0001_initial
Create Date: 2026-04-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_run_outputs"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("evaluation_runs", sa.Column("result_output", postgresql.JSONB(), nullable=True))
    op.add_column("evaluation_runs", sa.Column("retrieval_trace", postgresql.JSONB(), nullable=True))
    op.add_column("evaluation_runs", sa.Column("metrics_detail", postgresql.JSONB(), nullable=True))
    op.add_column("evaluation_runs", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("evaluation_runs", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("evaluation_runs", "completed_at")
    op.drop_column("evaluation_runs", "started_at")
    op.drop_column("evaluation_runs", "metrics_detail")
    op.drop_column("evaluation_runs", "retrieval_trace")
    op.drop_column("evaluation_runs", "result_output")
