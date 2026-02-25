"""SQLAlchemy ORM models — mirrors the SQL schema in the implementation plan."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Double,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    systems: Mapped[list["SystemDefinition"]] = relationship(
        "SystemDefinition", back_populates="project", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# System Definitions
# ---------------------------------------------------------------------------


class SystemDefinition(Base):
    __tablename__ = "system_definitions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    project: Mapped["Project"] = relationship("Project", back_populates="systems")
    nodes: Mapped[list["SystemNode"]] = relationship(
        "SystemNode", back_populates="system", cascade="all, delete-orphan"
    )
    edges: Mapped[list["SystemEdge"]] = relationship(
        "SystemEdge", back_populates="system", cascade="all, delete-orphan"
    )
    runs: Mapped[list["EvaluationRun"]] = relationship(
        "EvaluationRun", back_populates="system", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# System Nodes
# ---------------------------------------------------------------------------


class SystemNode(Base):
    __tablename__ = "system_nodes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    system_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("system_definitions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    position_x: Mapped[float] = mapped_column(Double, nullable=False, default=0.0)
    position_y: Mapped[float] = mapped_column(Double, nullable=False, default=0.0)
    code_component_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("component_library.id", ondelete="SET NULL"),
        nullable=True,
    )
    inputs: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    outputs: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)

    system: Mapped["SystemDefinition"] = relationship("SystemDefinition", back_populates="nodes")


# ---------------------------------------------------------------------------
# System Edges
# ---------------------------------------------------------------------------


class SystemEdge(Base):
    __tablename__ = "system_edges"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    system_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("system_definitions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    target: Mapped[str] = mapped_column(String(64), nullable=False)

    system: Mapped["SystemDefinition"] = relationship("SystemDefinition", back_populates="edges")


# ---------------------------------------------------------------------------
# Evaluation Runs
# ---------------------------------------------------------------------------


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("system_definitions.id", ondelete="CASCADE"),
        nullable=False,
    )
    system_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="running")
    config_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Metrics (nullable until job completes)
    metric_precision: Mapped[float | None] = mapped_column(Double, nullable=True)
    metric_recall: Mapped[float | None] = mapped_column(Double, nullable=True)
    metric_mrr: Mapped[float | None] = mapped_column(Double, nullable=True)
    metric_latency_ms: Mapped[float | None] = mapped_column(Double, nullable=True)
    metric_token_usage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metric_cost_usd: Mapped[float | None] = mapped_column(Double, nullable=True)
    metric_hallucination: Mapped[float | None] = mapped_column(Double, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    system: Mapped["SystemDefinition"] = relationship("SystemDefinition", back_populates="runs")


# ---------------------------------------------------------------------------
# API Key Secrets
# ---------------------------------------------------------------------------


class ApiKeySecret(Base):
    __tablename__ = "api_key_secrets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    value_enc: Mapped[str] = mapped_column(Text, nullable=False)
    last_used: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


# ---------------------------------------------------------------------------
# Default Configs
# ---------------------------------------------------------------------------


class DefaultConfig(Base):
    __tablename__ = "default_configs"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)


# ---------------------------------------------------------------------------
# Component Library
# ---------------------------------------------------------------------------


class ComponentLibrary(Base):
    __tablename__ = "component_library"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    node_type: Mapped[str] = mapped_column(String(32), nullable=False)
    provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    language: Mapped[str] = mapped_column(String(16), nullable=False, default="python")
    code: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_builtin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    requirements: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    env_vars: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
