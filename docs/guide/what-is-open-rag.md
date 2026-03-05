# What is open-rag?

**open-rag** is an open-source visual studio for designing, configuring, evaluating, and deploying Retrieval-Augmented Generation (RAG) pipelines.

## Core principles

- **Self-hosted** — runs entirely on your own infrastructure or locally on your machine. No SaaS, no telemetry, no vendor lock-in.
- **Privacy-first** — your documents, API keys, and query logs never leave your machine.
- **Composable** — every pipeline stage (loader → chunker → embedder → retriever → LLM) is a node on a visual canvas. Mix and match components from the built-in library or write your own.
- **Evaluatable** — run end-to-end retrieval evaluations and compare results with RAGAS-based metrics without leaving the UI.

## Architecture overview

```
┌─────────────────────────────────────┐
│           React Frontend            │  ← Visual canvas, config UI, eval views
│         (Vite + TypeScript)         │
└───────────────┬─────────────────────┘
                │  REST API (FastAPI)
┌───────────────▼─────────────────────┐
│          Python Backend             │  ← Pipeline execution, evaluation, storage
│     (FastAPI + SQLAlchemy + arq)    │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│            PostgreSQL               │  ← Projects, systems, runs, settings
└─────────────────────────────────────┘
```

## Key concepts

| Concept | Description |
|---------|-------------|
| **Project** | A workspace that groups one or more system designs and their evaluation runs. |
| **System** | A versioned RAG pipeline graph saved to a project. |
| **Run** | An evaluation execution of a system against a prompt or dataset, producing metrics. |
| **Component** | A reusable Python code snippet (e.g. an OpenAI embedder, a Qdrant retriever) that can be dropped onto the canvas. |
