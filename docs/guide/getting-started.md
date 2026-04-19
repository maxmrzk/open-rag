# Getting Started

This guide walks you through launching open-rag for the first time using Docker Compose (recommended) or from source.

## Prerequisites

### Docker Compose (recommended)

| Tool | Minimum version |
|------|-----------------|
| Docker | 24.x |
| Docker Compose | v2.x (bundled with Docker Desktop) |

### From source

| Tool | Minimum version |
|------|-----------------|
| Python | 3.11 |
| Node.js | 20 LTS |
| pnpm | 8.x |
| PostgreSQL | 15 |

## Quick start (Docker)

```bash
git clone https://github.com/maxmrzk/open-rag
cd open-rag
cp .env.example .env        # fill in SECRET_KEY at minimum
docker compose up -d
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Quick start (from source)

```bash
git clone https://github.com/maxmrzk/open-rag
cd open-rag

# Backend
cd backend
cp .env.example .env        # configure DATABASE_URL and SECRET_KEY
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload &

# Frontend (new terminal)
cd ../frontend
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

## First steps

1. **Create a project** — click **New Project** on the Projects page.
2. **Open the System Designer** — design your RAG pipeline by dragging nodes from the sidebar.
3. **Save to project** — use the **Save to Project** button in the designer toolbar.
4. **Run an evaluation** — click **Run** and enter a prompt or dataset path.
5. **View results** — navigate to the **Runs** page to inspect metrics.
