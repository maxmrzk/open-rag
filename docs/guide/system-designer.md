# System Designer

The System Designer is the core of open-rag. It provides a visual canvas where you compose RAG pipeline stages as connected nodes.

## Node types

| Node | Role |
|------|------|
| **Document Loader** | Entry point — loads text from files, URLs, or databases. All data enters the graph here. |
| **Text Splitter** | Chunks the loaded text using a strategy (character, recursive, semantic). |
| **Embedder** | Converts chunks to dense vectors using a model (OpenAI, HuggingFace, local). |
| **Vector Store** | Persists and retrieves embeddings (Qdrant, Chroma, in-memory). |
| **Retriever** | Queries the vector store given a prompt, returns top-k chunks. |
| **Graph Store** | Optional Neo4j or NetworkX node for knowledge-graph-augmented retrieval. |
| **LLM** | Generates a response from the retrieved context (OpenAI, Anthropic, Ollama). |
| **Output** | Terminal node — collects the final answer for evaluation. |

## Toolbar actions

- **Run** — opens a modal to enter a prompt or dataset path, then starts an evaluation run.
- **Save to Project** — saves the current graph as a versioned system in a project.

## Connecting nodes

Drag from any node's output handle to another node's input handle to create an edge. The designer validates connections and prevents incompatible pairings (e.g. connecting a Vector Store directly to an LLM without a Retriever).
