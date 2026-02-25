# RAG System Builder — Backend Implementation Plan

> **Document version:** 1.0 · **Date:** 2026-02-24  
> **Audience:** Backend engineer / AI agent responsible for building the server that powers this frontend.  
> **Frontend stack:** React 18 · TypeScript · React Query · Zod v3.23.8 · Vite  
> **Expected backend base URL:** `http://localhost:8000/api/v1` (configurable via `VITE_API_BASE_URL`)

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Tech-Stack Recommendations](#2-tech-stack-recommendations)
3. [Data Models & Database Schema](#3-data-models--database-schema)
4. [API Contract — Shared Envelope](#4-api-contract--shared-envelope)
5. [Endpoints — Projects](#5-endpoints--projects)
6. [Endpoints — Systems](#6-endpoints--systems)
7. [Endpoints — Runs & Evaluations](#7-endpoints--runs--evaluations)
8. [Endpoints — Docker Export](#8-endpoints--docker-export)
9. [Endpoints — Settings](#9-endpoints--settings)
10. [Background Jobs](#10-background-jobs)
11. [Frontend ↔ Backend Wiring Guide](#11-frontend--backend-wiring-guide)
12. [Environment Variables](#12-environment-variables)
13. [CORS & Security](#13-cors--security)
14. [Zod Schemas Reference (Source of Truth)](#14-zod-schemas-reference-source-of-truth)
15. [Suggested Implementation Order](#15-suggested-implementation-order)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Vite / React)                       │
│                                                                      │
│  Pages:  Projects │ System Designer │ Evaluations │ Runs │ Settings  │
│  State:  TanStack React Query (server state) + local React state     │
│  API Client: /src/app/api/client.ts  →  fetch()  →  REST JSON       │
└────────────────────────────┬────────────────────────────────────────┘
                             │  HTTP/JSON  (base: /api/v1)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FastAPI / Express / etc.                       │
│                                                                      │
│  Routers:                                                            │
│    /projects          CRUD projects                                  │
│    /projects/{id}/systems   CRUD system definitions                  │
│    /systems/{id}      get / update / delete individual system        │
│    /systems/{id}/runs trigger + list runs for a system               │
│    /runs/{id}         get a single run                               │
│    /runs/compare      side-by-side metric query                      │
│    /systems/{id}/export/docker   generate Dockerfile + compose       │
│    /settings/api-keys  CRUD secret API key records                   │
│    /settings/defaults  save/load default node configs                │
│    /health            liveness probe                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         PostgreSQL      Redis / BullMQ   Object Store
         (primary DB)    (job queue)      (S3 / MinIO)
              │
   ┌──────────┴──────────┐
   │  Tables              │
   │  projects            │
   │  system_definitions  │
   │  system_nodes        │
   │  system_edges        │
   │  evaluation_runs     │
   │  api_key_secrets     │
   └──────────────────────┘
```

### User Journey (end-to-end)

1. **Projects page** — user creates/selects a project (`GET /projects`, `POST /projects`).
2. **System Designer** — user loads a system definition for the selected project (`GET /projects/{id}/systems`), drags nodes onto the canvas, connects them, edits JSON config via Monaco editor, then saves (`PUT /systems/{id}`).
3. **Run System** — user clicks "Run System" → `POST /systems/{id}/runs` enqueues a background evaluation job.
4. **Runs page** — user polls / receives live status updates for running jobs (`GET /systems/{id}/runs`, `GET /runs/{id}`).
5. **Evaluations page** — user selects ≥2 completed runs to compare via radar/bar charts (`GET /runs/compare?baseline={id}&compared={ids}`).
6. **Docker Export** — user clicks "Export Docker" → `GET /systems/{id}/export/docker` returns generated `Dockerfile` + `docker-compose.yml` text.
7. **Settings** — user manages encrypted API key secrets and default node configs (`/settings/*`).

---

## 2. Tech-Stack Recommendations

| Layer | Recommended | Notes |
|---|---|---|
| Language | **Python 3.11+** | Matches the generated Dockerfile already in the mock |
| Framework | **FastAPI** | Async, Pydantic v2 schema validation, OpenAPI auto-docs |
| ORM | **SQLAlchemy 2.x** (async) + **Alembic** | Async sessions, migration support |
| Database | **PostgreSQL 15+** | UUID primary keys, JSONB for node configs |
| Queue | **Redis + ARQ** (or Celery) | Background evaluation runs |
| Auth | **API key header** (`X-API-Key`) or JWT (Bearer) | Start with static dev key, add JWT later |
| Secrets encryption | **cryptography (Fernet)** | Encrypt `api_key_secrets.value` at rest |
| Object store | **MinIO / AWS S3** | For uploaded documents and evaluation datasets |
| Docker SDK | **docker-py** | Programmatic Dockerfile/compose generation |
| Testing | **pytest + httpx (AsyncClient)** | Contract tests against Zod shapes |

---

## 3. Data Models & Database Schema

### 3.1 `projects`

```sql
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Derived counts are computed with sub-queries / views, NOT stored columns.
```

> **Frontend expects** `systemCount` and `runCount` on every project object.  
> Compute them via a single SQL join or two correlated sub-queries in the `GET /projects` handler.

### 3.2 `system_definitions`

```sql
CREATE TABLE system_definitions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3 `system_nodes`

```sql
CREATE TABLE system_nodes (
    id           VARCHAR(64) NOT NULL,        -- frontend-assigned e.g. "node-1"
    system_id    UUID NOT NULL REFERENCES system_definitions(id) ON DELETE CASCADE,
    type         VARCHAR(32) NOT NULL,         -- NodeType enum value
    name         VARCHAR(255) NOT NULL,
    config       JSONB NOT NULL DEFAULT '{}',
    position_x   DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y   DOUBLE PRECISION NOT NULL DEFAULT 0,
    PRIMARY KEY (id, system_id)
);
```

### 3.4 `system_edges`

```sql
CREATE TABLE system_edges (
    id        VARCHAR(64) NOT NULL,
    system_id UUID NOT NULL REFERENCES system_definitions(id) ON DELETE CASCADE,
    source    VARCHAR(64) NOT NULL,
    target    VARCHAR(64) NOT NULL,
    PRIMARY KEY (id, system_id)
);
```

### 3.5 `evaluation_runs`

```sql
CREATE TABLE evaluation_runs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id         UUID NOT NULL REFERENCES system_definitions(id) ON DELETE CASCADE,
    system_name       VARCHAR(255) NOT NULL,   -- snapshot of name at run time
    status            VARCHAR(16) NOT NULL DEFAULT 'running',  -- running|completed|failed
    config_snapshot   JSONB NOT NULL DEFAULT '{}',
    -- Metrics (nullable until job completes)
    metric_precision        DOUBLE PRECISION,
    metric_recall           DOUBLE PRECISION,
    metric_mrr              DOUBLE PRECISION,
    metric_latency_ms       DOUBLE PRECISION,
    metric_token_usage      INTEGER,
    metric_cost_usd         DOUBLE PRECISION,
    metric_hallucination    DOUBLE PRECISION,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.6 `api_key_secrets`

```sql
CREATE TABLE api_key_secrets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(128) NOT NULL UNIQUE,  -- e.g. "OPENAI_API_KEY"
    value_enc   TEXT NOT NULL,                 -- Fernet-encrypted value
    last_used   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.7 `default_configs` (optional key-value store)

```sql
CREATE TABLE default_configs (
    key   VARCHAR(128) PRIMARY KEY,   -- e.g. "chunkSize", "embeddingModel"
    value TEXT NOT NULL
);
```

---

## 4. API Contract — Shared Envelope

**Every response** from the backend must conform to the `ApiResponseSchema` defined in  
`/src/app/api/schemas/common.schema.ts`:

```typescript
// Zod source of truth
const ApiResponseSchema = z.object({
  data:       <T>,             // the actual payload
  success:    z.boolean(),
  message:    z.string().optional(),
  pagination: PaginationSchema.optional(), // only on list endpoints
});

const PaginationSchema = z.object({
  page:     number,   // current page (1-based)
  pageSize: number,   // items per page (default 20, max 100)
  total:    number,   // total item count
});
```

### Success response shape

```json
{
  "data": { ... },
  "success": true,
  "message": "Optional human-readable string"
}
```

### Error response shape

```json
{
  "data": null,
  "success": false,
  "message": "Descriptive error string"
}
```

HTTP status codes must be semantically correct: `200`, `201`, `400`, `404`, `409`, `422`, `500`.

---

## 5. Endpoints — Projects

### `GET /projects`

**Description:** List all projects. Includes computed `systemCount` and `runCount`.

**Query params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | int | 1 | 1-based |
| `pageSize` | int | 20 | max 100 |

**Response `data`:** `ProjectOutput[]`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Customer Support RAG",
      "description": "RAG pipeline for internal customer support knowledge base.",
      "createdAt": "2026-02-10T09:00:00Z",
      "systemCount": 3,
      "runCount": 12
    }
  ],
  "success": true,
  "pagination": { "page": 1, "pageSize": 20, "total": 4 }
}
```

**Frontend hook:** `useProjects()` in `/src/app/hooks/useProjects.ts`  
**Activate by uncommenting:**
```typescript
return useApiQuery({
  queryKey: ['projects'],
  url: '/projects',
  schema: ProjectListSchema,
});
```

---

### `POST /projects`

**Description:** Create a new project.

**Request body:**
```json
{
  "name": "My New Project",
  "description": "Optional description"
}
```

**Zod input schema:** `CreateProjectSchema`
```typescript
z.object({
  name:        z.string().min(1).max(255),
  description: z.string().optional(),
})
```

**Response `data`:** `ProjectOutput` (the created project, HTTP 201)

**Frontend hook:** `useCreateProject()` mutation in `/src/app/hooks/useProjects.ts`  
After activating, the `CreateProjectModal` in `projects-page.tsx` will POST real data.

---

### `GET /projects/{projectId}`

**Description:** Get a single project by UUID.

**Response `data`:** `ProjectOutput`  
**Errors:** `404` if not found.

---

### `PUT /projects/{projectId}`

**Description:** Update project name or description.

**Request body:** Same shape as `CreateProjectSchema` (all fields optional on PATCH semantics).

**Response `data`:** Updated `ProjectOutput`

---

### `DELETE /projects/{projectId}`

**Description:** Delete a project and cascade-delete all systems and runs.

**Response `data`:** `null`, HTTP 200  
**Errors:** `404` if not found.

---

## 6. Endpoints — Systems

### `GET /projects/{projectId}/systems`

**Description:** List all system definitions belonging to a project.

**Query params:** `page`, `pageSize`

**Response `data`:** `SystemDefinitionOutput[]`

Each item includes fully denormalized `nodes[]` and `edges[]` arrays (fetched via JOIN):

```json
{
  "data": [
    {
      "id": "sys-001-uuid-...",
      "projectId": "a1b2c3d4-...",
      "name": "Hybrid RAG v2",
      "version": 2,
      "nodes": [
        {
          "id": "node-1",
          "type": "document_loader",
          "name": "PDF Loader",
          "config": { "source": "s3://docs-bucket/support/", "fileTypes": ["pdf"] },
          "position": { "x": 50, "y": 200 }
        }
      ],
      "edges": [
        { "id": "e1-2", "source": "node-1", "target": "node-2" }
      ],
      "createdAt": "2026-02-18T10:00:00Z",
      "updatedAt": "2026-02-23T15:30:00Z"
    }
  ],
  "success": true,
  "pagination": { "page": 1, "pageSize": 20, "total": 2 }
}
```

**Zod schema:** `SystemListSchema` in `/src/app/api/schemas/system.schema.ts`  
**Frontend hook:** `useSystems(projectId)` in `/src/app/hooks/useSystems.ts`

---

### `POST /projects/{projectId}/systems`

**Description:** Create a new system definition (initially empty canvas).

**Request body:**
```json
{
  "name": "My RAG System",
  "nodes": [],
  "edges": []
}
```

**Response `data`:** `SystemDefinitionOutput` with `version: 1` and empty node/edge arrays. HTTP 201.

---

### `GET /systems/{systemId}`

**Description:** Fetch a single system definition (full nodes + edges).

**Frontend hook:** `useSystem(systemId)` in `/src/app/hooks/useSystems.ts`  
This is the primary loader for the **System Designer** page. The frontend hydrates ReactFlow from this response.

**Response `data`:** `SystemDefinitionOutput`

---

### `PUT /systems/{systemId}`

**Description:** **Full save** of the current canvas state. Replaces all nodes and edges. Also increments `version` and sets `updatedAt`.

**Request body:**
```json
{
  "name": "Hybrid RAG v2",
  "nodes": [
    {
      "id": "node-1",
      "type": "document_loader",
      "name": "PDF Loader",
      "config": { "source": "s3://...", "fileTypes": ["pdf"] },
      "position": { "x": 50, "y": 200 }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "node-1", "target": "node-2" }
  ]
}
```

**Implementation note:** Use a transaction. Delete existing `system_nodes` and `system_edges` for this `systemId`, then bulk-insert the new arrays. This is simpler and safer than a diff-based upsert.

**Response `data`:** Updated `SystemDefinitionOutput`

> **Where this is called from:** In `designer-page.tsx`, the "Save Config" button in `ConfigPanel` currently only updates local state. The `handleSaveConfig` callback should also call `PUT /systems/{systemId}` with the full updated nodes array.

---

### `DELETE /systems/{systemId}`

**Description:** Delete a system definition and its runs.

**Response `data`:** `null`, HTTP 200

---

## 7. Endpoints — Runs & Evaluations

### `POST /systems/{systemId}/runs`

**Description:** Trigger a new evaluation run for this system. Enqueues a background job.

**Request body:**
```json
{}
```
(No body required. The backend reads the current system definition from the DB and creates a `configSnapshot` automatically.)

**Implementation:**
1. Read the system definition from the DB.
2. Create an `evaluation_runs` record with `status = 'running'` and `configSnapshot` = current node configs (serialized JSON).
3. Enqueue a background job (ARQ / Celery) passing the `runId`.
4. Return the run record immediately (HTTP 202 Accepted).

**Response `data`:** `EvaluationRunOutput` with `status: "running"` and zeroed metrics.

---

### `GET /systems/{systemId}/runs`

**Description:** List all evaluation runs for a system, newest first.

**Query params:** `page`, `pageSize`

**Response `data`:** `EvaluationRunOutput[]`

```json
{
  "data": [
    {
      "id": "run-001-...",
      "systemId": "sys-001-...",
      "systemName": "Hybrid RAG v2",
      "metrics": {
        "precision": 0.89,
        "recall": 0.82,
        "mrr": 0.91,
        "latencyMs": 340,
        "tokenUsage": 15230,
        "costUsd": 0.045,
        "hallucinationScore": 0.08
      },
      "configSnapshot": { "embedder": "text-embedding-3-large", "chunkSize": 512 },
      "status": "completed",
      "createdAt": "2026-02-23T10:00:00Z"
    }
  ],
  "success": true,
  "pagination": { "page": 1, "pageSize": 20, "total": 6 }
}
```

**Frontend hooks:**
- `useRuns(systemId)` — used in `RunsPage` and `EvaluationsPage`
- Activate by uncommenting the query in `/src/app/hooks/useRuns.ts`

---

### `GET /runs/{runId}`

**Description:** Fetch a single run by UUID. Used for polling run status.

**Response `data`:** `EvaluationRunOutput`

**Frontend polling pattern** (to add in `RunsPage`):
```typescript
const { data } = useQuery({
  queryKey: ['run', runId],
  queryFn: () => apiClient.get(`/runs/${runId}`),
  refetchInterval: (data) => data?.status === 'running' ? 3000 : false,
});
```

---

### `GET /runs/compare`

**Description:** Fetch multiple runs for side-by-side comparison. This powers the radar + bar charts in `EvaluationsPage`.

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `baseline` | UUID | Yes | The "reference" run ID |
| `compared` | UUID (repeated) | Yes, ≥1 | `?baseline=X&compared=Y&compared=Z` |

**Response `data`:** `EvaluationRunOutput[]` — the baseline first, then the compared runs in order.

**Frontend hook:** `useRunComparison(baselineId, comparedIds)` in `/src/app/hooks/useRuns.ts`

**Implementation:**
```sql
SELECT * FROM evaluation_runs
WHERE id = ANY(:ids)
  AND status = 'completed'
ORDER BY created_at DESC;
```
Return in the requested order (baseline first).

---

## 8. Endpoints — Docker Export

### `GET /systems/{systemId}/export/docker`

**Description:** Generate and return `Dockerfile` and `docker-compose.yml` text derived from the system definition.

**Response `data`:**
```json
{
  "dockerfile": "FROM python:3.11-slim AS base\n...",
  "dockerCompose": "version: \"3.9\"\nservices:\n  rag-api:\n    ..."
}
```

**Generation logic** (deterministic — no LLM needed):

1. Load the system definition from the DB.
2. Inspect node types and configs to determine which services are needed:
   - `vector_store` node with `provider: "qdrant"` → add Qdrant service + volume
   - `graph_store` node with `provider: "neo4j"` → add Neo4j service + volume
   - `embedder` node with `apiKeyEnv` field → add that env var to the API service
   - `llm` node with `provider: "openai"` → add `OPENAI_API_KEY` env var
3. Fill in a template (see `mockDockerfile` and `mockDockerCompose` in `/src/app/mock/docker.ts` as the gold-standard output format).

**Frontend usage:** `DockerExportModal` at `/src/app/features/system-designer/docker-export-modal.tsx`  
Currently reads from `mockDockerfile` / `mockDockerCompose`. Swap to a real API call:
```typescript
const { data } = useQuery({
  queryKey: ['docker-export', systemId],
  queryFn: () => apiClient.get(`/systems/${systemId}/export/docker`),
  enabled: !!systemId,
  staleTime: Infinity,  // generation is deterministic per system version
});
```

---

## 9. Endpoints — Settings

### `GET /settings/api-keys`

**Description:** List all stored API key records (names + masked values).

**Response `data`:**
```json
[
  {
    "id": "uuid",
    "name": "OPENAI_API_KEY",
    "value": "sk-...Xk9f",   // last 4 chars only — NEVER return plaintext
    "lastUsed": "2026-02-24T08:00:00Z"
  }
]
```

---

### `POST /settings/api-keys`

**Description:** Store a new encrypted API key.

**Request body:**
```json
{
  "name": "COHERE_API_KEY",
  "value": "co-actual-secret-value-here"
}
```

**Implementation:** Encrypt `value` with Fernet before storing. Return the record with masked value.

---

### `DELETE /settings/api-keys/{keyId}`

**Description:** Revoke (delete) a stored API key.

---

### `GET /settings/defaults`

**Description:** Return the current default config values.

**Response `data`:**
```json
{
  "chunkSize": "512",
  "chunkOverlap": "64",
  "embeddingModel": "text-embedding-3-large",
  "llmModel": "gpt-4o",
  "temperature": "0.1",
  "topK": "10"
}
```

---

### `PUT /settings/defaults`

**Description:** Save one or more default config values (upsert key-value pairs).

**Request body:**
```json
{
  "chunkSize": "1024",
  "temperature": "0.2"
}
```

---

### `GET /health`

**Description:** Liveness probe. Returns `200 OK` immediately.

```json
{ "status": "ok", "timestamp": "2026-02-24T12:00:00Z" }
```

---

## 10. Background Jobs

The "Run System" flow requires async execution. The backend must not block the HTTP response while the RAG pipeline runs.

### Job: `evaluate_system`

**Trigger:** `POST /systems/{systemId}/runs` (see Section 7)

**Steps inside the job worker:**

```
1. Load system definition from DB (nodes + edges + configs)
2. Resolve API key values from api_key_secrets (decrypt with Fernet)
3. Execute the RAG pipeline:
   a. document_loader   → load documents from configured source
   b. chunker           → split documents per config (chunkSize, overlap, strategy)
   c. embedder          → generate embeddings (calls OpenAI/Cohere/etc. API)
   d. vector_store      → upsert vectors into Qdrant / Pinecone / etc.
   e. graph_store       → (optional) build knowledge graph in Neo4j
   f. retriever         → run test queries, retrieve context
   g. reranker          → rerank retrieved results
   h. llm               → generate answers for test dataset
   i. evaluation        → compute RAGAS / custom metrics
4. Write final metrics to evaluation_runs row
5. Set status = 'completed' (or 'failed' on exception)
```

**Key fields written back to DB:**
```python
run.metric_precision     = result.precision
run.metric_recall        = result.recall
run.metric_mrr           = result.mrr
run.metric_latency_ms    = result.latency_ms
run.metric_token_usage   = result.token_usage
run.metric_cost_usd      = result.cost_usd
run.metric_hallucination = result.hallucination_score
run.status               = "completed"
```

**Error handling:** On any unhandled exception, set `status = "failed"` and write the error message somewhere accessible (e.g., a `error_message TEXT` column you can add to `evaluation_runs`).

**Polling:** The frontend can poll `GET /runs/{runId}` every 3 seconds until `status !== "running"`.

---

## 11. Frontend ↔ Backend Wiring Guide

The frontend hooks are **already written** but their real implementations are commented out. Below is every file that needs to be changed and exactly which commented block to uncomment.

### `/src/app/hooks/useProjects.ts`

```typescript
// UNCOMMENT this block:
import { useApiQuery, useApiMutation } from "./useApi";
import { ProjectListSchema, ProjectSchema } from "../api/schemas/project.schema";

export const useProjects = () => {
  return useApiQuery({
    queryKey: ['projects'],
    url: '/projects',
    schema: ProjectListSchema,
  });
};

export const useCreateProject = () => {
  return useApiMutation<ProjectInput, ProjectOutput>({
    url: '/projects',
    method: 'POST',
    schema: ProjectSchema,
  });
};
```

After uncommenting, also update `CreateProjectModal` in `projects-page.tsx` to call
`createProject.mutate({ name, description })` and invalidate the `['projects']` query on success.

---

### `/src/app/hooks/useSystems.ts`

```typescript
// UNCOMMENT this block:
import { useApiQuery } from "./useApi";
import { SystemDefinitionSchema, SystemListSchema } from "../api/schemas/system.schema";

export const useSystems = (projectId?: string) => {
  return useApiQuery({
    queryKey: ['systems', projectId],
    url: `/projects/${projectId}/systems`,
    schema: SystemListSchema,
    enabled: !!projectId,
  });
};

export const useSystem = (systemId?: string) => {
  return useApiQuery({
    queryKey: ['system', systemId],
    url: `/systems/${systemId}`,
    schema: SystemDefinitionSchema,
    enabled: !!systemId,
  });
};
```

You will also need to add a `useUpdateSystem` mutation hook (not yet written):

```typescript
export const useUpdateSystem = (systemId: string) => {
  return useApiMutation<{ name: string; nodes: SystemNode[]; edges: SystemEdge[] }, SystemDefinitionOutput>({
    url: `/systems/${systemId}`,
    method: 'PUT',
    schema: SystemDefinitionSchema,
  });
};
```

Call this in `designer-page.tsx` wherever `handleSaveConfig` or "Save" is triggered.

---

### `/src/app/hooks/useRuns.ts`

```typescript
// UNCOMMENT this block:
import { useApiQuery } from "./useApi";
import { EvaluationRunListSchema } from "../api/schemas/run.schema";

export const useRuns = (systemId?: string) => {
  return useApiQuery({
    queryKey: ['runs', systemId],
    url: `/systems/${systemId}/runs`,
    schema: EvaluationRunListSchema,
    enabled: !!systemId,
  });
};

export const useRunComparison = (baselineId?: string, comparedIds?: string[]) => {
  const params = comparedIds?.map(id => `compared=${id}`).join('&') ?? '';
  return useApiQuery({
    queryKey: ['run-comparison', baselineId, ...(comparedIds ?? [])],
    url: `/runs/compare?baseline=${baselineId}&${params}`,
    schema: EvaluationRunListSchema,
    enabled: !!baselineId && (comparedIds?.length ?? 0) > 0,
  });
};
```

---

### `designer-page.tsx` — Run System button

Replace the mock handler:
```typescript
// Before:
const handleRunSystem = () => toast.success("System run started (mock)");

// After:
const { mutate: startRun } = useMutation({
  mutationFn: () => apiClient.post(`/systems/${system?.id}/runs`, {}),
  onSuccess: () => {
    toast.success("Evaluation run started");
    queryClient.invalidateQueries({ queryKey: ['runs', system?.id] });
  },
});
const handleRunSystem = () => startRun();
```

---

### `docker-export-modal.tsx` — Real generation

```typescript
// Before: reads mockDockerfile / mockDockerCompose
// After:
const { data: exportData } = useQuery({
  queryKey: ['docker-export', systemId],
  queryFn: () => apiClient.get<{ dockerfile: string; dockerCompose: string }>(
    `/systems/${systemId}/export/docker`
  ),
});
```

---

### `config-panel.tsx` — Node config schema validation

When "Save Config" is clicked, after updating local state call `PUT /systems/{systemId}` with the full updated nodes array (batched save). This ensures the backend always has the latest graph state.

---

## 12. Environment Variables

### Frontend (`.env` / Vite)

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Backend

```
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/ragbuilder

# Redis (for job queue)
REDIS_URL=redis://localhost:6379/0

# Encryption (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
SECRET_FERNET_KEY=your-base64-fernet-key-here

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Optional: default LLM/embedding providers
DEFAULT_OPENAI_API_KEY=sk-...   # fallback only; prefer per-project keys from DB
```

---

## 13. CORS & Security

The Vite dev server runs on `http://localhost:5173` by default. The backend **must** include CORS headers:

**FastAPI example:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Security checklist

- [ ] **Never** return plaintext API key values from `GET /settings/api-keys`. Return only masked strings (e.g. last 4 chars).
- [ ] Encrypt all secret values at rest using Fernet symmetric encryption.
- [ ] Validate all UUIDs in path parameters — return `422` for malformed UUIDs before hitting the DB.
- [ ] Rate-limit `POST /systems/{id}/runs` per project (e.g. 5 concurrent runs max).
- [ ] Set `Content-Security-Policy` headers in production.
- [ ] Use parameterized queries only — never raw string concatenation in SQL.

---

## 14. Zod Schemas Reference (Source of Truth)

These files in the frontend codebase are the **canonical** definition of every request and response shape. The backend must produce data that passes Zod `.parse()` validation on the frontend.

### `/src/app/api/schemas/common.schema.ts`
```typescript
UUIDSchema      = z.string().uuid()
TimestampSchema = z.string().datetime({ offset: true }).or(z.string())

PaginationSchema = z.object({
  page:     z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  total:    z.number().int().min(0),
})

ApiResponseSchema = z.object({
  data:       T,
  success:    z.boolean(),
  message:    z.string().optional(),
  pagination: PaginationSchema.optional(),
})
```

### `/src/app/api/schemas/project.schema.ts`
```typescript
ProjectSchema = z.object({
  id:          UUIDSchema,
  name:        z.string().min(1).max(255),
  description: z.string().optional(),
  createdAt:   TimestampSchema,
  systemCount: z.number().int().min(0),
  runCount:    z.number().int().min(0),
})

CreateProjectSchema = z.object({
  name:        z.string().min(1).max(255),
  description: z.string().optional(),
})
```

### `/src/app/api/schemas/system.schema.ts`
```typescript
NodeTypeSchema = z.enum([
  "document_loader", "chunker", "embedder",
  "vector_store", "graph_store", "retriever",
  "reranker", "llm", "evaluation"
])

SystemNodeSchema = z.object({
  id:       z.string(),
  type:     NodeTypeSchema,
  name:     z.string(),
  config:   z.record(z.unknown()),
  position: z.object({ x: z.number(), y: z.number() }),
})

SystemEdgeSchema = z.object({
  id:     z.string(),
  source: z.string(),
  target: z.string(),
})

SystemDefinitionSchema = z.object({
  id:        UUIDSchema,
  projectId: UUIDSchema,
  name:      z.string().min(1),
  version:   z.number().int().min(1),
  nodes:     z.array(SystemNodeSchema),
  edges:     z.array(SystemEdgeSchema),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
})
```

### `/src/app/api/schemas/run.schema.ts`
```typescript
MetricsSchema = z.object({
  precision:        z.number().min(0).max(1),
  recall:           z.number().min(0).max(1),
  mrr:              z.number().min(0).max(1),
  latencyMs:        z.number().min(0),
  tokenUsage:       z.number().int().min(0),
  costUsd:          z.number().min(0),
  hallucinationScore: z.number().min(0).max(1),
})

RunStatusSchema = z.enum(["completed", "running", "failed"])

EvaluationRunSchema = z.object({
  id:             UUIDSchema,
  systemId:       UUIDSchema,
  systemName:     z.string(),
  metrics:        MetricsSchema,
  configSnapshot: z.record(z.unknown()),
  status:         RunStatusSchema,
  createdAt:      TimestampSchema,
})

RunComparisonSchema = z.object({
  baselineRunId:  UUIDSchema,
  comparedRunIds: z.array(UUIDSchema),
})
```

> **Important:** Even for a `running` run, the `metrics` object must be present and contain numeric zero values (not `null`). The frontend renders `—` for running runs by checking `run.status !== "completed"`, but the Zod schema still parses the full metrics object. See mock data in `/src/app/mock/runs.ts` for the exact zero-value pattern.

---

## 15. Suggested Implementation Order

Build and test in this sequence to unblock the frontend incrementally:

| Phase | Endpoints | Unblocks |
|---|---|---|
| **1 — Foundation** | `GET /health`, DB migrations, CORS, response envelope | Everything |
| **2 — Projects** | `GET /projects`, `POST /projects`, `GET /projects/{id}` | Projects page fully functional |
| **3 — Systems** | `GET /projects/{id}/systems`, `POST /projects/{id}/systems`, `GET /systems/{id}`, `PUT /systems/{id}` | System Designer load + save |
| **4 — Runs (sync mock)** | `POST /systems/{id}/runs` (returns fake completed run immediately), `GET /systems/{id}/runs`, `GET /runs/{id}` | Runs page + Evaluations page |
| **5 — Comparison** | `GET /runs/compare` | Evaluations radar/bar charts |
| **6 — Docker Export** | `GET /systems/{id}/export/docker` | Docker export modal |
| **7 — Settings** | `/settings/api-keys/*`, `/settings/defaults` | Settings page |
| **8 — Async Jobs** | Redis + ARQ worker, real pipeline execution | Real evaluation metrics |
| **9 — Polish** | Pagination, error handling, rate limiting, audit logs | Production readiness |

---

## Appendix A — API Client Location

The frontend API client is located at `/src/app/api/client.ts`.  
It calls `fetch()` and throws on non-2xx responses. No authentication headers are sent by default — add them here when auth is ready:

```typescript
// In ApiClient.request(), add:
"Authorization": `Bearer ${getAccessToken()}`,
```

## Appendix B — React Query Cache Keys

The following cache keys are used in the frontend. Your backend must invalidate and refetch correctly after mutations. Match these exactly when adding `queryClient.invalidateQueries()` calls in mutation `onSuccess` handlers:

| Cache key | Endpoint | Notes |
|---|---|---|
| `['projects']` | `GET /projects` | Invalidate after create/update/delete project |
| `['systems', projectId]` | `GET /projects/{id}/systems` | Invalidate after create/update/delete system |
| `['system', systemId]` | `GET /systems/{id}` | Invalidate after `PUT /systems/{id}` |
| `['runs', systemId]` | `GET /systems/{id}/runs` | Invalidate after `POST /systems/{id}/runs` |
| `['run', runId]` | `GET /runs/{id}` | Polled every 3s while `status === "running"` |
| `['run-comparison', baselineId, ...comparedIds]` | `GET /runs/compare` | Refetch when selection changes |
| `['docker-export', systemId]` | `GET /systems/{id}/export/docker` | Stale-time Infinity (deterministic) |

## Appendix C — Node Type Config Shapes

Each node type's `config` field is a free-form `Record<string, unknown>` (validated as `z.record(z.unknown())`), but the following shapes are expected by the frontend mock data and the Docker export generator:

| Node Type | Key Config Fields |
|---|---|
| `document_loader` | `source`, `fileTypes[]`, `recursive`, `maxFileSize` |
| `chunker` | `strategy`, `chunkSize`, `chunkOverlap`, `separators[]` |
| `embedder` | `model`, `dimensions`, `batchSize`, `apiKeyEnv` |
| `vector_store` | `provider`, `collection`, `host`, `port`, `distance` |
| `graph_store` | `provider`, `uri`, `database`, `entityExtraction`, `relationExtraction` |
| `retriever` | `strategy`, `vectorWeight`, `graphWeight`, `topK`, `scoreThreshold` |
| `reranker` | `model`, `topK`, `batchSize` |
| `llm` | `provider`, `model`, `temperature`, `maxTokens`, `systemPrompt`, `apiKeyEnv` |
| `evaluation` | `framework`, `metrics[]`, `testDataset`, `numSamples` |

These are not schema-enforced server-side, but the Docker export generator and job runner should understand them.

---

## Appendix D — Component Library API

> **Added:** 2026-02-24 — supports the new **Component Library** feature.

The frontend now allows users to create, edit, and delete Python code components that are linked to system nodes. These components must be persisted server-side (stored as JSON blobs — **never executed**).

### D.1 `component_library` Table

```sql
CREATE TABLE component_library (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,  -- NULL = global built-in
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    node_type    VARCHAR(32) NOT NULL,   -- NodeType enum
    provider     VARCHAR(32),           -- openai | google | anthropic | cohere | huggingface | langchain | custom
    language     VARCHAR(16) NOT NULL DEFAULT 'python',
    code         TEXT NOT NULL,
    is_default   BOOLEAN NOT NULL DEFAULT false,
    is_builtin   BOOLEAN NOT NULL DEFAULT false,
    tags         TEXT[],                -- searchable tags
    requirements TEXT[],               -- pip package specifiers
    env_vars     TEXT[],               -- env vars the code reads
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_component_library_node_type ON component_library(node_type);
CREATE INDEX idx_component_library_project_id ON component_library(project_id);
```

### D.2 Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/component-library` | List all components (global + project-scoped) |
| `POST` | `/component-library` | Create a new component |
| `GET` | `/component-library/{id}` | Fetch a single component |
| `PUT` | `/component-library/{id}` | Update code/metadata |
| `DELETE` | `/component-library/{id}` | Delete (non-built-in only) |

#### `GET /component-library`

**Query params:** `nodeType`, `provider`, `search`, `page`, `pageSize`

**Response `data`:** `CodeComponentOutput[]`

```json
[
  {
    "id": "uuid",
    "name": "OpenAI Embeddings",
    "description": "...",
    "nodeType": "embedder",
    "provider": "openai",
    "language": "python",
    "code": "from openai import OpenAI\n...",
    "isDefault": true,
    "isBuiltin": true,
    "tags": ["openai", "text-embedding-3-small"],
    "requirements": ["openai>=1.0.0"],
    "envVars": ["OPENAI_API_KEY"],
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

#### `POST /component-library`

```json
{
  "name": "My Custom Embedder",
  "description": "...",
  "nodeType": "embedder",
  "provider": "custom",
  "code": "def get_embedding(text):\n    ...",
  "tags": ["custom"],
  "requirements": [],
  "envVars": []
}
```

> **Security:** The `code` field is stored as-is and **never executed server-side**. It is sent back to the frontend/Electron desktop app to be run locally by the user.

### D.3 System Node → Component Linkage

Extend the `system_nodes` table:

```sql
ALTER TABLE system_nodes
    ADD COLUMN code_component_id UUID REFERENCES component_library(id) ON DELETE SET NULL,
    ADD COLUMN inputs  TEXT[] DEFAULT '{}',   -- edge IDs flowing in
    ADD COLUMN outputs TEXT[] DEFAULT '{}';   -- edge IDs flowing out
```

The frontend sends `codeComponentId`, `inputs`, and `outputs` as part of the `PUT /systems/{systemId}` payload. The backend stores them transparently.

---

## Appendix E — System JSON Export / Import

### E.1 File-based Persistence (Current Implementation)

Until a backend is available, the frontend exports the entire system as a portable JSON file:

```json
{
  "version": "1.0",
  "exportedAt": "2026-02-24T12:00:00Z",
  "system": {
    "name": "Hybrid RAG v2",
    "nodes": [ /* SystemNode[] with codeComponentId, inputs, outputs */ ],
    "edges": [ /* SystemEdge[] */ ]
  },
  "components": [ /* CodeComponent[] referenced by nodes in this system */ ]
}
```

This allows complete system portability — sharing a `.json` file is enough for another user to load the entire pipeline including all code.

### E.2 Backend Import Endpoint (Future)

```
POST /systems/import
Content-Type: application/json
```

Request body: the `SystemExport` JSON object above.

The backend should:
1. Upsert all `components` into `component_library` (match on `id`, skip built-ins)
2. Create a new `system_definition` row from `system.name`
3. Bulk-insert `system.nodes` and `system.edges`
4. Return the created `SystemDefinitionOutput`

```
GET /systems/{systemId}/export
```

Returns the full `SystemExport` JSON for download.

---

## Appendix F — Deployment Options

### F.1 Self-hosted (Recommended for Development)

```bash
# 1. Start infrastructure
docker compose up -d postgres redis qdrant neo4j

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt

# 3. Run migrations
alembic upgrade head

# 4. Start API server
uvicorn main:app --reload --port 8000

# 5. Start Vite dev server
cd ../frontend
pnpm dev
```

**Python code execution** happens entirely in the background job worker running on the user's machine. No code is sent to any remote server.

### F.2 Electron Desktop App (Planned)

For users who want a standalone application without managing Docker or Python environments:

- The Electron shell bundles:
  - A precompiled FastAPI binary (via PyInstaller)
  - A bundled SQLite database (replacing PostgreSQL for single-user use)
  - The React frontend served locally
  - An embedded Python interpreter for executing node code

**Architecture:**
```
[Electron Main Process]
    ├─ Spawns bundled FastAPI subprocess  →  http://localhost:8000/api/v1
    ├─ Serves React frontend             →  http://localhost:5173 (iframe)
    └─ IPC for file system access (save/load system JSON)

[Python Subprocess]
    └─ Runs all node code in isolated venv
    └─ Never sends code or data externally
```

**Download page UI:** A "Download Desktop App" button/link is shown in Settings → Deployment.

**Frontend wiring:** The `VITE_API_BASE_URL` env var is injected at build time. Electron builds set it to `http://localhost:8000/api/v1`. Web builds can point to any self-hosted backend.

### F.3 Privacy & Security Guarantees

- Python code is **stored as text** in the database (encrypted at rest via Fernet)
- Code is **only executed** in the user's local Python process — never on the API server
- Embedding API calls go **directly** from the user's machine to the AI provider
- Evaluation results/metrics are the only data that flows back to the backend DB
- No telemetry, no code upload, no remote execution

---

## Appendix G — Updated Zod Schema for System Nodes (v2)

The `SystemNodeSchema` must be updated to include the new fields:

```typescript
SystemNodeSchema = z.object({
  id:               z.string(),
  type:             NodeTypeSchema,
  name:             z.string(),
  config:           z.record(z.unknown()),
  position:         z.object({ x: z.number(), y: z.number() }),
  codeComponentId:  z.string().uuid().optional(),
  inputs:           z.array(z.string()).default([]),
  outputs:          z.array(z.string()).default([]),
})
```

Update this in `/src/app/api/schemas/system.schema.ts` before activating the real backend hooks.