# RAG System Builder

A full-stack application for designing, evaluating, and deploying RAG (Retrieval-Augmented Generation) pipelines. Build systems visually, run evaluations, compare metrics, and export to Docker.

**Stack:** FastAPI · SQLAlchemy (async) · PostgreSQL · Redis · ARQ · React 18 · TypeScript · Vite · Tailwind CSS

---

## Dev Setup

Tested and ran on `Ubuntu VERSION="24.04.1 LTS (Noble Numbat)"`. Windows might cause problems with the alembic setup (not tested properly).

### Prerequisites

- [uv](https://docs.astral.sh/uv/) — Python package manager
- [pnpm](https://pnpm.io/) v10.28+
- Docker (for infrastructure)
- Python 3.11+
- Node.js 20+

### 1. Start infrastructure

```bash
docker compose up -d postgres redis qdrant neo4j
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # fill in SECRET_FERNET_KEY (see below)
uv sync --extra dev
uv run alembic upgrade head
uv run python main.py         # http://localhost:8000
```

Generate a Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev                      # http://localhost:5173
```

`frontend/.env` is committed with development defaults (`VITE_API_BASE_URL=http://localhost:8000/api/v1`). Override locally if needed.

---

## Tests

### Backend

```bash
cd backend
uv run python -m pytest tests/ -v
```

Coverage report is written to `backend/coverage.xml`. Minimum threshold: 40%.

### Frontend

```bash
cd frontend
pnpm test            # single run
pnpm test:watch      # watch mode
pnpm test:coverage   # with coverage
```

---

## Deployment

All services are defined in `docker-compose.yml`. The backend image uses a multi-stage uv build.

### Environment variables (backend)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL async URL (`postgresql+asyncpg://...`) |
| `REDIS_URL` | yes | Redis URL (`redis://...`) |
| `SECRET_FERNET_KEY` | yes | Fernet key for API key encryption |
| `ALLOWED_ORIGINS` | no | Comma-separated CORS origins |

### Build and run

```bash
# Copy and edit environment config
cp backend/.env.example backend/.env

# Build images and start all services
docker compose up -d --build
```

The API worker is a separate container that shares the same image:

```yaml
# in docker-compose.yml
worker:
  command: arq app.worker.WorkerSettings
```

### Database migrations

Run once after first deploy, and after each release that includes schema changes:

```bash
docker compose exec api alembic upgrade head
```

### Accessing the application

Once all containers are up (`docker compose up -d --build`) and migrations have run:

| Service | URL | Notes |
|---|---|---|
| REST API | http://localhost:8000 | FastAPI backend |
| API docs (Swagger) | http://localhost:8000/docs | Interactive API explorer |
| API docs (ReDoc) | http://localhost:8000/redoc | Alternative API reference |
| Qdrant dashboard | http://localhost:6333/dashboard | Vector DB UI |
| Neo4j browser | http://localhost:7474 | Graph DB UI (user: `neo4j`, password: `changeme`) |

> **Frontend:** not included in `docker-compose.yml`. Run it separately with `pnpm dev` (see [Dev Setup](#dev-setup) above) — it connects to the API at `http://localhost:8000/api/v1`.

---

## CI

GitHub Actions workflow at `.github/workflows/ci.yml`. Triggers on push and pull requests to `main`.

Two independent jobs run in parallel:

| Job | Runner | Steps |
|---|---|---|
| `backend-tests` | ubuntu-latest | `uv sync --extra dev --frozen` → `pytest` with coverage |
| `frontend-tests` | ubuntu-latest | `pnpm install --frozen-lockfile` → `vitest run` |

Coverage XML is uploaded as a build artifact (`backend-coverage`) on every run.
