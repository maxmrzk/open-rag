# Installation

## Environment variables

Copy `.env.example` to `.env` in the project root (or `backend/`) and set the following:

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | Random 32+ char string used for token signing and encryption. Generate with `openssl rand -hex 32`. |
| `DATABASE_URL` | ✅ | PostgreSQL connection string, e.g. `postgresql+asyncpg://user:pass@localhost/openrag`. |
| `REDIS_URL` | Optional | Redis/Valkey URL for the arq job queue. Defaults to `redis://localhost:6379`. |
| `CORS_ORIGINS` | Optional | Comma-separated list of allowed frontend origins. Defaults to `http://localhost:5173`. |

## Database migrations

Run Alembic migrations before starting the backend for the first time (or after any upgrade):

```bash
cd backend
uv run alembic upgrade head
```

## Running the worker

The evaluation worker is a separate arq process:

```bash
cd backend
uv run python -m app.worker
```

In Docker Compose this starts automatically as the `worker` service.

## Building the frontend

```bash
cd frontend
pnpm install
pnpm build          # outputs to frontend/dist/
```

The built assets are served by the FastAPI backend at `/` in production.
