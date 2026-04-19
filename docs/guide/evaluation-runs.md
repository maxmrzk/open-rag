# Evaluation Runs

An **evaluation run** executes a saved system against a prompt or dataset and records retrieval metrics.

## Starting a run

1. Open a system in the **System Designer**.
2. Click **Run** in the toolbar.
3. Enter a free-text prompt or a dataset path in the modal.
4. Click **Start Run** — the evaluation is dispatched to the background worker.

## Metrics recorded

| Metric | Description |
|--------|-------------|
| `precision` | Proportion of retrieved chunks that are relevant. |
| `recall` | Proportion of relevant chunks that were retrieved. |
| `mrr` | Mean Reciprocal Rank of the first relevant result. |
| `latencyMs` | End-to-end latency in milliseconds. |
| `tokenUsage` | Total tokens consumed by the LLM call. |
| `costUsd` | Estimated cost in USD based on model pricing. |
| `hallucination` | Hallucination score (0 = none, 1 = complete). |

## Viewing runs

- **Runs page** — filter by system across all projects.
- **Project detail page** — see all runs scoped to a project.
- **Evaluations page** — compare multiple runs side-by-side.
