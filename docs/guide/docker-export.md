# Docker Export

The Docker Export feature generates a production-ready `docker-compose.yml` and a Python `main.py` entry-point from any system graph you design.

## How it works

1. Open a system in the **System Designer**.
2. Open the **···** menu and select **Export → Docker Compose**.
3. A zip archive is downloaded containing:
   - `Dockerfile` — Python 3.11 slim image with all required packages.
   - `docker-compose.yml` — wires up the app with optional Qdrant and Neo4j sidecars.
   - `main.py` — FastAPI entry-point that exposes a `/query` endpoint backed by your pipeline.
   - `requirements.txt` — pinned dependencies inferred from the graph nodes.

## Generated file structure

```
export/
├── Dockerfile
├── docker-compose.yml
├── main.py
├── requirements.txt
└── .env.example
```

## Running the export

```bash
unzip export.zip -d my-rag-service
cd my-rag-service
cp .env.example .env    # set your API keys
docker compose up
```

Your RAG system is now running at `http://localhost:8000/query`.
