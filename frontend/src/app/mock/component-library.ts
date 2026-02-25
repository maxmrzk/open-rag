import type { CodeComponent } from "../types";

// ============================================================
// Default built-in code components
// ============================================================

const NOW = "2026-02-24T00:00:00Z";

export const defaultComponents: CodeComponent[] = [
  // ──────────────────────────────────────────
  // EMBEDDER — OpenAI
  // ──────────────────────────────────────────
  {
    id: "builtin-embedder-openai",
    name: "OpenAI Embeddings",
    description: "text-embedding-3-small / large via the official OpenAI Python SDK",
    nodeType: "embedder",
    provider: "openai",
    language: "python",
    isDefault: true,
    isBuiltin: true,
    tags: ["openai", "text-embedding-3-small", "text-embedding-3-large", "ada"],
    requirements: ["openai>=1.0.0"],
    envVars: ["OPENAI_API_KEY"],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from openai import OpenAI
import pandas as pd

client = OpenAI()  # reads OPENAI_API_KEY from environment


def get_embedding(text: str, model: str = "text-embedding-3-small") -> list[float]:
    """Generate an embedding for a single text string."""
    text = text.replace("\\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding


def embed_documents(
    texts: list[str],
    model: str = "text-embedding-3-small",
    batch_size: int = 100,
) -> list[list[float]]:
    """Batch-embed a list of texts, honouring the API batch limit."""
    embeddings: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = [t.replace("\\n", " ") for t in texts[i : i + batch_size]]
        response = client.embeddings.create(input=batch, model=model)
        embeddings.extend([item.embedding for item in response.data])
    return embeddings


# ── Example: embed a DataFrame column ──────────────────────────────────────
# df["embedding"] = df["combined"].apply(
#     lambda x: get_embedding(x, model="text-embedding-3-small")
# )
# df.to_csv("output/embedded_reviews.csv", index=False)
`,
  },

  // ──────────────────────────────────────────
  // EMBEDDER — Google
  // ──────────────────────────────────────────
  {
    id: "builtin-embedder-google",
    name: "Google Embeddings",
    description: "text-embedding-004 via the google-generativeai SDK",
    nodeType: "embedder",
    provider: "google",
    language: "python",
    isDefault: false,
    isBuiltin: true,
    tags: ["google", "gemini", "text-embedding-004"],
    requirements: ["google-generativeai>=0.7.0"],
    envVars: ["GOOGLE_API_KEY"],
    createdAt: NOW,
    updatedAt: NOW,
    code: `import google.generativeai as genai
import os

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])


def get_embedding(
    text: str,
    model: str = "models/text-embedding-004",
    task_type: str = "retrieval_document",
) -> list[float]:
    """Generate an embedding using Google's text-embedding model."""
    result = genai.embed_content(model=model, content=text, task_type=task_type)
    return result["embedding"]


def embed_documents(
    texts: list[str],
    model: str = "models/text-embedding-004",
    task_type: str = "retrieval_document",
) -> list[list[float]]:
    """Embed a list of texts (sequential — Google SDK doesn't batch natively)."""
    return [get_embedding(t, model=model, task_type=task_type) for t in texts]


# Task types:
#   retrieval_document  – when embedding corpus documents
#   retrieval_query     – when embedding a user query
#   semantic_similarity – for STS benchmarks
#   classification      – for downstream classifiers
`,
  },

  // ──────────────────────────────────────────
  // EMBEDDER — Cohere
  // ──────────────────────────────────────────
  {
    id: "builtin-embedder-cohere",
    name: "Cohere Embeddings",
    description: "embed-english-v3.0 / embed-multilingual-v3.0 via Cohere SDK",
    nodeType: "embedder",
    provider: "cohere",
    language: "python",
    isDefault: false,
    isBuiltin: true,
    tags: ["cohere", "embed-english-v3", "embed-multilingual-v3"],
    requirements: ["cohere>=5.0.0"],
    envVars: ["COHERE_API_KEY"],
    createdAt: NOW,
    updatedAt: NOW,
    code: `import cohere
import os

co = cohere.Client(os.environ["COHERE_API_KEY"])


def get_embedding(
    text: str,
    model: str = "embed-english-v3.0",
    input_type: str = "search_document",
) -> list[float]:
    """Generate an embedding for a single text using Cohere."""
    response = co.embed(texts=[text], model=model, input_type=input_type)
    return response.embeddings[0]


def embed_documents(
    texts: list[str],
    model: str = "embed-english-v3.0",
    input_type: str = "search_document",
    batch_size: int = 96,
) -> list[list[float]]:
    """Batch-embed documents (max 96 per request)."""
    embeddings: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = co.embed(texts=batch, model=model, input_type=input_type)
        embeddings.extend(response.embeddings)
    return embeddings


# input_type values:
#   search_document  – index-time embedding
#   search_query     – query-time embedding
#   classification   – classification tasks
#   clustering       – clustering tasks
`,
  },

  // ──────────────────────────────────────────
  // EMBEDDER — HuggingFace Sentence-Transformers
  // ──────────────────────────────────────────
  {
    id: "builtin-embedder-hf",
    name: "HuggingFace Sentence Transformers",
    description: "Local embeddings via sentence-transformers (no API key required)",
    nodeType: "embedder",
    provider: "huggingface",
    language: "python",
    isDefault: false,
    isBuiltin: true,
    tags: ["huggingface", "sentence-transformers", "local", "offline"],
    requirements: ["sentence-transformers>=2.6.0", "torch>=2.0.0"],
    envVars: [],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from sentence_transformers import SentenceTransformer

# Popular models (uncomment the one you want):
# MODEL_NAME = "all-MiniLM-L6-v2"         # fast, small  (384-d)
# MODEL_NAME = "all-mpnet-base-v2"         # best quality (768-d)
# MODEL_NAME = "BAAI/bge-large-en-v1.5"   # SOTA English (1024-d)
# MODEL_NAME = "intfloat/e5-large-v2"     # E5 family     (1024-d)
MODEL_NAME = "all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


def get_embedding(text: str) -> list[float]:
    """Generate an embedding using a local SentenceTransformer model."""
    return model.encode(text, normalize_embeddings=True).tolist()


def embed_documents(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """Batch-embed documents using the local model."""
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    return embeddings.tolist()
`,
  },

  // ──────────────────────────────────────────
  // LLM — OpenAI GPT
  // ──────────────────────────────────────────
  {
    id: "builtin-llm-openai",
    name: "OpenAI GPT",
    description: "GPT-4o / GPT-4o-mini via the OpenAI Chat Completions API",
    nodeType: "llm",
    provider: "openai",
    language: "python",
    isDefault: true,
    isBuiltin: true,
    tags: ["openai", "gpt-4o", "gpt-4o-mini", "chat-completions"],
    requirements: ["openai>=1.0.0"],
    envVars: ["OPENAI_API_KEY"],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from openai import OpenAI

client = OpenAI()  # reads OPENAI_API_KEY from environment

SYSTEM_PROMPT = (
    "You are a helpful assistant. "
    "Use ONLY the provided context to answer the user's question. "
    "If the answer is not in the context, say so honestly."
)


def generate_response(
    query: str,
    context: list[str],
    model: str = "gpt-4o",
    temperature: float = 0.1,
    max_tokens: int = 2048,
    system_prompt: str = SYSTEM_PROMPT,
) -> str:
    """Generate a RAG response using OpenAI GPT."""
    context_text = "\\n\\n".join(
        f"[{i + 1}] {chunk}" for i, chunk in enumerate(context)
    )
    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"Context:\\n{context_text}\\n\\nQuestion: {query}",
            },
        ],
    )
    return response.choices[0].message.content


# ── Streaming variant ───────────────────────────────────────────────────────
def stream_response(query: str, context: list[str], **kwargs):
    """Yield response chunks for streaming display."""
    context_text = "\\n\\n".join(context)
    stream = client.chat.completions.create(
        model=kwargs.get("model", "gpt-4o"),
        stream=True,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\\n{context_text}\\n\\n{query}"},
        ],
    )
    for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
`,
  },

  // ──────────────────────────────────────────
  // LLM — Anthropic Claude
  // ──────────────────────────────────────────
  {
    id: "builtin-llm-anthropic",
    name: "Anthropic Claude",
    description: "Claude 3.5 Sonnet / Claude 3 Opus via the Anthropic SDK",
    nodeType: "llm",
    provider: "anthropic",
    language: "python",
    isDefault: false,
    isBuiltin: true,
    tags: ["anthropic", "claude", "claude-3-5-sonnet", "claude-3-opus"],
    requirements: ["anthropic>=0.25.0"],
    envVars: ["ANTHROPIC_API_KEY"],
    createdAt: NOW,
    updatedAt: NOW,
    code: `import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from environment

SYSTEM_PROMPT = (
    "You are a helpful assistant. "
    "Use ONLY the provided context to answer the user's question. "
    "If the answer is not in the context, say so honestly."
)


def generate_response(
    query: str,
    context: list[str],
    model: str = "claude-opus-4-5",
    max_tokens: int = 2048,
    temperature: float = 0.1,
    system_prompt: str = SYSTEM_PROMPT,
) -> str:
    """Generate a RAG response using Anthropic Claude."""
    context_text = "\\n\\n".join(
        f"[{i + 1}] {chunk}" for i, chunk in enumerate(context)
    )
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": f"Context:\\n{context_text}\\n\\nQuestion: {query}",
            }
        ],
    )
    return message.content[0].text


# Available models:
#   claude-opus-4-5         – most capable
#   claude-sonnet-4-5       – balanced speed / quality
#   claude-haiku-3-5        – fastest, cheapest
`,
  },

  // ──────────────────────────────────────────
  // LLM — Google Gemini
  // ──────────────────────────────────────────
  {
    id: "builtin-llm-google",
    name: "Google Gemini",
    description: "Gemini 1.5 Pro / Flash via the google-generativeai SDK",
    nodeType: "llm",
    provider: "google",
    language: "python",
    isDefault: false,
    isBuiltin: true,
    tags: ["google", "gemini", "gemini-1.5-pro", "gemini-1.5-flash"],
    requirements: ["google-generativeai>=0.7.0"],
    envVars: ["GOOGLE_API_KEY"],
    createdAt: NOW,
    updatedAt: NOW,
    code: `import google.generativeai as genai
import os

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

SYSTEM_PROMPT = (
    "You are a helpful assistant. "
    "Use ONLY the provided context to answer the user's question. "
    "If the answer is not in the context, say so honestly."
)


def generate_response(
    query: str,
    context: list[str],
    model: str = "gemini-1.5-pro",
    temperature: float = 0.1,
    max_tokens: int = 2048,
    system_prompt: str = SYSTEM_PROMPT,
) -> str:
    """Generate a RAG response using Google Gemini."""
    context_text = "\\n\\n".join(
        f"[{i + 1}] {chunk}" for i, chunk in enumerate(context)
    )
    model_client = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )
    prompt = f"Context:\\n{context_text}\\n\\nQuestion: {query}"
    response = model_client.generate_content(prompt)
    return response.text


# Available models:
#   gemini-1.5-pro    – most capable, 1M-token context
#   gemini-1.5-flash  – fast and cost-efficient
#   gemini-2.0-flash  – next-gen speed
`,
  },

  // ──────────────────────────────────────────
  // DOCUMENT LOADER — LangChain Multi-Format
  // ──────────────────────────────────────────
  {
    id: "builtin-loader-langchain",
    name: "LangChain Multi-Format Loader",
    description: "Load PDF, DOCX, TXT, Markdown, and web pages via LangChain loaders",
    nodeType: "document_loader",
    provider: "langchain",
    language: "python",
    isDefault: true,
    isBuiltin: true,
    tags: ["langchain", "pdf", "docx", "txt", "markdown", "web"],
    requirements: [
      "langchain>=0.2.0",
      "langchain-community>=0.2.0",
      "pypdf>=4.0.0",
      "unstructured>=0.12.0",
    ],
    envVars: [],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredMarkdownLoader,
    WebBaseLoader,
    DirectoryLoader,
)
from langchain.schema import Document
from pathlib import Path


def load_documents(source_path: str, recursive: bool = True) -> list[Document]:
    """Load documents from a file, directory, or URL."""
    if source_path.startswith(("http://", "https://")):
        loader = WebBaseLoader([source_path])
        return loader.load()

    path = Path(source_path)

    if path.is_file():
        return _load_single_file(path)

    # Directory: load all supported files
    documents: list[Document] = []
    pattern = "**/*" if recursive else "*"
    for file_path in path.glob(pattern):
        if file_path.is_file():
            documents.extend(_load_single_file(file_path))
    print(f"Loaded {len(documents)} document(s) from {source_path}")
    return documents


def _load_single_file(path: Path) -> list[Document]:
    """Select the right loader based on file extension."""
    ext = path.suffix.lower()
    loaders = {
        ".pdf":  PyPDFLoader,
        ".docx": UnstructuredWordDocumentLoader,
        ".txt":  TextLoader,
        ".md":   UnstructuredMarkdownLoader,
        ".rst":  TextLoader,
    }
    loader_cls = loaders.get(ext)
    if loader_cls is None:
        print(f"Skipping unsupported file type: {path}")
        return []
    loader = loader_cls(str(path))
    return loader.load()
`,
  },

  // ──────────────────────────────────────────
  // CHUNKER — Recursive Text Splitter
  // ──────────────────────────────────────────
  {
    id: "builtin-chunker-recursive",
    name: "Recursive Text Splitter",
    description: "Split documents recursively on paragraph, sentence, and word boundaries",
    nodeType: "chunker",
    provider: "langchain",
    language: "python",
    isDefault: true,
    isBuiltin: true,
    tags: ["langchain", "recursive", "character-splitter"],
    requirements: ["langchain>=0.2.0"],
    envVars: [],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document


def chunk_documents(
    documents: list[Document],
    chunk_size: int = 512,
    chunk_overlap: int = 64,
    separators: list[str] | None = None,
) -> list[Document]:
    """Split documents into chunks using recursive character splitting."""
    if separators is None:
        separators = ["\\n\\n", "\\n", ". ", " ", ""]

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=separators,
        length_function=len,
        add_start_index=True,  # stores byte offset in metadata
    )
    chunks = splitter.split_documents(documents)
    print(f"Split {len(documents)} doc(s) → {len(chunks)} chunk(s)")
    return chunks
`,
  },

  // ──────────────────────────────────────────
  // CHUNKER — Semantic Splitter
  // ──────────────────────────────────────────
  {
    id: "builtin-chunker-semantic",
    name: "Semantic Splitter",
    description: "Splits on meaning boundaries using embedding cosine similarity",
    nodeType: "chunker",
    provider: "langchain",
    language: "python",
    isDefault: false,
    isBuiltin: true,
    tags: ["langchain", "semantic", "embedding-based"],
    requirements: ["langchain-experimental>=0.0.50", "openai>=1.0.0"],
    envVars: ["OPENAI_API_KEY"],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document


def chunk_documents(
    documents: list[Document],
    breakpoint_type: str = "percentile",   # "percentile" | "standard_deviation" | "interquartile"
    breakpoint_threshold: float = 95.0,
    embedding_model: str = "text-embedding-3-small",
) -> list[Document]:
    """Split documents on semantic boundaries (uses embeddings — costs API calls)."""
    embeddings = OpenAIEmbeddings(model=embedding_model)
    splitter = SemanticChunker(
        embeddings,
        breakpoint_threshold_type=breakpoint_type,
        breakpoint_threshold_amount=breakpoint_threshold,
    )
    chunks = splitter.split_documents(documents)
    print(f"Semantic split: {len(documents)} doc(s) → {len(chunks)} chunk(s)")
    return chunks
`,
  },

  // ──────────────────────────────────────────
  // RETRIEVER — Hybrid (BM25 + Vector)
  // ──────────────────────────────────────────
  {
    id: "builtin-retriever-hybrid",
    name: "Hybrid Retriever (BM25 + Vector)",
    description: "Combines keyword (BM25) and semantic (vector) retrieval via EnsembleRetriever",
    nodeType: "retriever",
    provider: "langchain",
    language: "python",
    isDefault: true,
    isBuiltin: true,
    tags: ["langchain", "hybrid", "bm25", "vector", "qdrant"],
    requirements: [
      "langchain>=0.2.0",
      "langchain-community>=0.2.0",
      "rank-bm25>=0.2.2",
      "qdrant-client>=1.9.0",
    ],
    envVars: [],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_community.vectorstores import Qdrant
from langchain.schema import Document
from qdrant_client import QdrantClient


def create_hybrid_retriever(
    documents: list[Document],
    embeddings,
    vector_weight: float = 0.7,
    bm25_weight: float = 0.3,
    top_k: int = 10,
    qdrant_url: str = "http://localhost:6333",
    collection_name: str = "documents",
):
    """Create a hybrid retriever combining BM25 and vector search."""
    # Keyword (BM25) retriever
    bm25 = BM25Retriever.from_documents(documents)
    bm25.k = top_k

    # Vector retriever (Qdrant)
    qdrant_client = QdrantClient(url=qdrant_url)
    vector_store = Qdrant(
        client=qdrant_client,
        collection_name=collection_name,
        embeddings=embeddings,
    )
    vector = vector_store.as_retriever(search_kwargs={"k": top_k})

    # Weighted ensemble
    return EnsembleRetriever(
        retrievers=[bm25, vector],
        weights=[bm25_weight, vector_weight],
    )


def retrieve(query: str, retriever, top_k: int = 10) -> list[Document]:
    """Run a retrieval query and return the top-k documents."""
    return retriever.get_relevant_documents(query)[:top_k]
`,
  },

  // ──────────────────────────────────────────
  // RE-RANKER — Cross-Encoder (HuggingFace)
  // ──────────────────────────────────────────
  {
    id: "builtin-reranker-crossencoder",
    name: "Cross-Encoder Reranker",
    description: "Re-rank retrieved chunks using a bi-encoder cross-encoder from HuggingFace",
    nodeType: "reranker",
    provider: "huggingface",
    language: "python",
    isDefault: true,
    isBuiltin: true,
    tags: ["huggingface", "cross-encoder", "ms-marco", "BAAI", "bge-reranker"],
    requirements: ["sentence-transformers>=2.6.0"],
    envVars: [],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from sentence_transformers import CrossEncoder

# Popular cross-encoder models (higher = slower but better):
# ──────────────────────────────────────────────────────────
# cross-encoder/ms-marco-MiniLM-L-6-v2   → fast,   MS-MARCO  (~80MB)
# cross-encoder/ms-marco-MiniLM-L-12-v2  → better, MS-MARCO  (~130MB)
# cross-encoder/ms-marco-electra-base    → best,   MS-MARCO  (~440MB)
# BAAI/bge-reranker-base                 → multilingual support
# BAAI/bge-reranker-large                → highest quality
MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-12-v2"

model = CrossEncoder(MODEL_NAME)


def rerank(
    query: str,
    documents: list[str],
    top_k: int = 5,
) -> list[dict]:
    """
    Score query–document pairs and return the top-k results.

    Returns:
        List of {"text": str, "score": float} sorted descending by score.
    """
    pairs = [[query, doc] for doc in documents]
    scores = model.predict(pairs)

    ranked = sorted(
        [{"text": doc, "score": float(score)} for doc, score in zip(documents, scores)],
        key=lambda x: x["score"],
        reverse=True,
    )
    return ranked[:top_k]


def rerank_documents(query: str, docs, top_k: int = 5):
    """Rerank LangChain Document objects."""
    texts = [d.page_content for d in docs]
    ranked = rerank(query, texts, top_k=top_k)
    # Rebuild document order
    text_to_doc = {d.page_content: d for d in docs}
    return [text_to_doc[r["text"]] for r in ranked if r["text"] in text_to_doc]
`,
  },

  // ──────────────────────────────────────────
  // GRAPH STORE — Neo4j
  // ──────────────────────────────────────────
  {
    id: "builtin-graphstore-neo4j",
    name: "Neo4j Knowledge Graph",
    description: "Store and query entities/relations in Neo4j via the official Python driver",
    nodeType: "graph_store",
    provider: "huggingface",
    language: "python",
    isDefault: true,
    isBuiltin: true,
    tags: ["neo4j", "graph", "knowledge-graph", "cypher"],
    requirements: ["neo4j>=5.0.0"],
    envVars: ["NEO4J_URI", "NEO4J_USER", "NEO4J_PASSWORD"],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from neo4j import GraphDatabase
import os

URI      = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
AUTH     = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password"))
DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

driver = GraphDatabase.driver(URI, auth=AUTH)


def add_entity(name: str, entity_type: str, properties: dict | None = None) -> None:
    """Upsert an entity node in the graph."""
    props = properties or {}
    with driver.session(database=DATABASE) as session:
        session.run(
            "MERGE (e:Entity {name: $name}) SET e.type = $type, e += $props",
            name=name,
            type=entity_type,
            props=props,
        )


def add_relation(source: str, relation: str, target: str) -> None:
    """Add a directed relationship between two entities."""
    with driver.session(database=DATABASE) as session:
        session.run(
            "MATCH (a:Entity {name: $source}), (b:Entity {name: $target}) "
            "MERGE (a)-[r:RELATES {type: $relation}]->(b)",
            source=source,
            relation=relation,
            target=target,
        )


def query_related(entity: str, depth: int = 2) -> list[dict]:
    """Find entities connected to a given entity up to specified depth."""
    with driver.session(database=DATABASE) as session:
        result = session.run(
            "MATCH (e:Entity {name: $name})-[*1..$depth]-(related) "
            "RETURN DISTINCT related.name AS name, related.type AS type",
            name=entity,
            depth=depth,
        )
        return [{"name": r["name"], "type": r["type"]} for r in result]


def close() -> None:
    driver.close()
`,
  },

  // ──────────────────────────────────────────
  // GRAPH STORE — NetworkX (in-memory)
  // ──────────────────────────────────────────
  {
    id: "builtin-graphstore-networkx",
    name: "NetworkX In-Memory Graph",
    description: "Lightweight in-memory knowledge graph using NetworkX — no external DB needed",
    nodeType: "graph_store",
    provider: "custom",
    language: "python",
    isDefault: false,
    isBuiltin: true,
    tags: ["networkx", "graph", "in-memory", "local"],
    requirements: ["networkx>=3.0", "matplotlib>=3.8.0"],
    envVars: [],
    createdAt: NOW,
    updatedAt: NOW,
    code: `import networkx as nx
import pickle
from pathlib import Path

G: nx.DiGraph = nx.DiGraph()


def add_entity(name: str, entity_type: str, **attrs) -> None:
    """Add or update an entity node."""
    G.add_node(name, type=entity_type, **attrs)


def add_relation(source: str, relation: str, target: str, **attrs) -> None:
    """Add a directed edge between two entities."""
    G.add_edge(source, target, relation=relation, **attrs)


def query_related(entity: str, depth: int = 2) -> list[dict]:
    """BFS-search nodes reachable from entity within depth hops."""
    if entity not in G:
        return []
    visited = set()
    queue = [(entity, 0)]
    results = []
    while queue:
        node, d = queue.pop(0)
        if node in visited or d > depth:
            continue
        visited.add(node)
        if node != entity:
            results.append({"name": node, "type": G.nodes[node].get("type", "unknown")})
        if d < depth:
            queue.extend((n, d + 1) for n in G.successors(node))
    return results


def save_graph(path: str = "knowledge_graph.pkl") -> None:
    """Persist graph to disk."""
    with open(path, "wb") as f:
        pickle.dump(G, f)
    print(f"Graph saved to {path} ({G.number_of_nodes()} nodes, {G.number_of_edges()} edges)")


def load_graph(path: str = "knowledge_graph.pkl") -> None:
    """Load graph from disk."""
    global G
    with open(path, "rb") as f:
        G = pickle.load(f)
    print(f"Graph loaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
`,
  },

  // ──────────────────────────────────────────
  // EVALUATION — RAGAS
  // ──────────────────────────────────────────
  {
    id: "builtin-eval-ragas",
    name: "RAGAS Evaluation",
    description: "RAG evaluation framework: faithfulness, relevancy, precision, recall",
    nodeType: "evaluation",
    provider: "custom",
    language: "python",
    isDefault: true,
    isBuiltin: true,
    tags: ["ragas", "evaluation", "metrics", "faithfulness", "relevancy"],
    requirements: ["ragas>=0.1.0", "datasets>=2.18.0"],
    envVars: ["OPENAI_API_KEY"],
    createdAt: NOW,
    updatedAt: NOW,
    code: `from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)


def evaluate_rag_pipeline(
    questions: list[str],
    answers: list[str],
    contexts: list[list[str]],
    ground_truths: list[str],
    metrics: list | None = None,
) -> dict:
    """
    Evaluate a RAG pipeline using RAGAS.

    Args:
        questions:     List of user questions
        answers:       List of generated answers
        contexts:      List of retrieved context lists (parallel to questions)
        ground_truths: List of reference answers
        metrics:       RAGAS metric objects to compute (default: all 4)

    Returns:
        Dict of metric name → score (0-1).
    """
    if metrics is None:
        metrics = [faithfulness, answer_relevancy, context_precision, context_recall]

    dataset = Dataset.from_dict(
        {
            "question": questions,
            "answer": answers,
            "contexts": contexts,
            "ground_truth": ground_truths,
        }
    )

    result = evaluate(dataset=dataset, metrics=metrics)

    print("── RAGAS Evaluation Results ──────────────────")
    for key, val in result.items():
        print(f"  {key:<28} {val:.4f}")
    print("─────────────────────────────────────────────")

    return dict(result)
`,
  },
];

/** Lookup a component by ID */
export function getComponentById(
  id: string,
  components: CodeComponent[] = defaultComponents
): CodeComponent | undefined {
  return components.find((c) => c.id === id);
}

/** Get default component for a node type */
export function getDefaultComponent(
  nodeType: string,
  components: CodeComponent[] = defaultComponents
): CodeComponent | undefined {
  return components.find((c) => c.nodeType === nodeType && c.isDefault);
}
