"""Pydantic v2 schemas (request/response shapes) for all API endpoints."""

import uuid
from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Shared envelope
# ---------------------------------------------------------------------------

T = TypeVar("T")


class Pagination(BaseModel):
    page: int = Field(ge=1, default=1)
    pageSize: int = Field(ge=1, le=100, default=20)
    total: int = Field(ge=0)


class ApiResponse(BaseModel, Generic[T]):
    data: T
    success: bool
    message: Optional[str] = None
    pagination: Optional[Pagination] = None


def ok(data: Any, message: str | None = None, pagination: Pagination | None = None) -> dict:
    """Helper: build a success envelope dict."""
    result: dict = {"data": data, "success": True}
    if message:
        result["message"] = message
    if pagination:
        result["pagination"] = pagination.model_dump()
    return result


def err(message: str, data: Any = None) -> dict:
    """Helper: build an error envelope dict."""
    return {"data": data, "success": False, "message": message}


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    createdAt: datetime
    systemCount: int = Field(ge=0, default=0)
    runCount: int = Field(ge=0, default=0)


# ---------------------------------------------------------------------------
# System Nodes / Edges
# ---------------------------------------------------------------------------


class NodePosition(BaseModel):
    x: float
    y: float


class SystemNodeIn(BaseModel):
    id: str
    type: str
    name: str
    config: dict[str, Any] = {}
    position: NodePosition
    codeComponentId: Optional[str] = None
    inputs: List[str] = []
    outputs: List[str] = []


class SystemNodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    name: str
    config: dict[str, Any]
    position: NodePosition
    codeComponentId: Optional[str] = None
    inputs: List[str] = []
    outputs: List[str] = []


class SystemEdgeIn(BaseModel):
    id: str
    source: str
    target: str


class SystemEdgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source: str
    target: str


# ---------------------------------------------------------------------------
# System Definitions
# ---------------------------------------------------------------------------


class SystemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    nodes: List[SystemNodeIn] = []
    edges: List[SystemEdgeIn] = []


class SystemUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    nodes: List[SystemNodeIn] = []
    edges: List[SystemEdgeIn] = []


class SystemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    projectId: uuid.UUID
    name: str
    version: int
    nodes: List[SystemNodeOut]
    edges: List[SystemEdgeOut]
    createdAt: datetime
    updatedAt: datetime


# ---------------------------------------------------------------------------
# Metrics / Runs
# ---------------------------------------------------------------------------


class MetricsOut(BaseModel):
    precision: float = 0.0
    recall: float = 0.0
    mrr: float = 0.0
    latencyMs: float = 0.0
    tokenUsage: int = 0
    costUsd: float = 0.0
    hallucinationScore: float = 0.0


class EvaluationRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    systemId: uuid.UUID
    systemName: str
    metrics: MetricsOut
    configSnapshot: dict[str, Any]
    status: str
    createdAt: datetime


# ---------------------------------------------------------------------------
# Docker Export
# ---------------------------------------------------------------------------


class DockerExportOut(BaseModel):
    dockerfile: str
    dockerCompose: str


# ---------------------------------------------------------------------------
# Settings — API Keys
# ---------------------------------------------------------------------------


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    value: str = Field(min_length=1)


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    value: str  # masked
    lastUsed: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Settings — Defaults
# ---------------------------------------------------------------------------


class DefaultsOut(BaseModel):
    chunkSize: str = "512"
    chunkOverlap: str = "64"
    embeddingModel: str = "text-embedding-3-large"
    llmModel: str = "gpt-4o"
    temperature: str = "0.1"
    topK: str = "10"


# ---------------------------------------------------------------------------
# Component Library
# ---------------------------------------------------------------------------


class ComponentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    nodeType: str
    provider: Optional[str] = None
    language: str = "python"
    code: str
    isDefault: bool = False
    tags: List[str] = []
    requirements: List[str] = []
    envVars: List[str] = []
    projectId: Optional[uuid.UUID] = None


class ComponentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodeType: Optional[str] = None
    provider: Optional[str] = None
    language: Optional[str] = None
    code: Optional[str] = None
    isDefault: Optional[bool] = None
    tags: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    envVars: Optional[List[str]] = None


class ComponentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    nodeType: str
    provider: Optional[str] = None
    language: str
    code: str
    isDefault: bool
    isBuiltin: bool
    tags: List[str]
    requirements: List[str]
    envVars: List[str]
    projectId: Optional[uuid.UUID] = None
    createdAt: datetime
    updatedAt: datetime
