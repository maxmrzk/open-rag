"""Initial schema — all tables

Revision ID: 0001_initial
Revises:
Create Date: 2026-02-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------------- projects
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # --------------------------------------------------------- component_library
    # Created before system_nodes because system_nodes has an FK into it.
    op.create_table(
        "component_library",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("node_type", sa.String(32), nullable=False),
        sa.Column("provider", sa.String(32), nullable=True),
        sa.Column("language", sa.String(16), nullable=False, server_default="python"),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_builtin", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"
        ),
        sa.Column(
            "requirements",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "env_vars",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_component_library_node_type", "component_library", ["node_type"]
    )
    op.create_index(
        "idx_component_library_project_id", "component_library", ["project_id"]
    )

    # ---------------------------------------------------- system_definitions
    op.create_table(
        "system_definitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ------------------------------------------------------------ system_nodes
    op.create_table(
        "system_nodes",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "system_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("system_definitions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("position_x", sa.Double(), nullable=False, server_default="0"),
        sa.Column("position_y", sa.Double(), nullable=False, server_default="0"),
        sa.Column(
            "code_component_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("component_library.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "inputs", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"
        ),
        sa.Column(
            "outputs",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )

    # ------------------------------------------------------------ system_edges
    op.create_table(
        "system_edges",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column(
            "system_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("system_definitions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("target", sa.String(64), nullable=False),
    )

    # --------------------------------------------------------- evaluation_runs
    op.create_table(
        "evaluation_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "system_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("system_definitions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("system_name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="running"),
        sa.Column(
            "config_snapshot", postgresql.JSONB(), nullable=False, server_default="{}"
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("metric_precision", sa.Double(), nullable=True),
        sa.Column("metric_recall", sa.Double(), nullable=True),
        sa.Column("metric_mrr", sa.Double(), nullable=True),
        sa.Column("metric_latency_ms", sa.Double(), nullable=True),
        sa.Column("metric_token_usage", sa.Integer(), nullable=True),
        sa.Column("metric_cost_usd", sa.Double(), nullable=True),
        sa.Column("metric_hallucination", sa.Double(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # -------------------------------------------------------- api_key_secrets
    op.create_table(
        "api_key_secrets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False, unique=True),
        sa.Column("value_enc", sa.Text(), nullable=False),
        sa.Column("last_used", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # -------------------------------------------------------- default_configs
    op.create_table(
        "default_configs",
        sa.Column("key", sa.String(128), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("default_configs")
    op.drop_table("api_key_secrets")
    op.drop_table("evaluation_runs")
    op.drop_table("system_edges")
    op.drop_table("system_nodes")
    op.drop_table("system_definitions")
    op.drop_index("idx_component_library_project_id", table_name="component_library")
    op.drop_index("idx_component_library_node_type", table_name="component_library")
    op.drop_table("component_library")
    op.drop_table("projects")
