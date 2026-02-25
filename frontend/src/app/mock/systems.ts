import type { SystemDefinition } from "../types";

export const mockSystemDefinition: SystemDefinition = {
  id: "sys-001-uuid-aaaa-bbbb-ccccddddeeee",
  projectId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  name: "Hybrid RAG v2",
  version: 2,
  nodes: [
    {
      id: "node-1",
      type: "document_loader",
      name: "PDF Loader",
      config: {
        source: "s3://docs-bucket/support/",
        fileTypes: ["pdf", "docx", "txt"],
        recursive: true,
        maxFileSize: "50MB",
      },
      position: { x: 50, y: 200 },
    },
    {
      id: "node-2",
      type: "chunker",
      name: "Recursive Splitter",
      config: {
        strategy: "recursive",
        chunkSize: 512,
        chunkOverlap: 64,
        separators: ["\n\n", "\n", ". ", " "],
      },
      position: { x: 300, y: 200 },
    },
    {
      id: "node-3",
      type: "embedder",
      name: "OpenAI Embeddings",
      config: {
        model: "text-embedding-3-large",
        dimensions: 1536,
        batchSize: 100,
        apiKeyEnv: "OPENAI_API_KEY",
      },
      position: { x: 550, y: 120 },
    },
    {
      id: "node-4",
      type: "vector_store",
      name: "Qdrant",
      config: {
        provider: "qdrant",
        collection: "support_docs",
        host: "localhost",
        port: 6333,
        distance: "cosine",
      },
      position: { x: 800, y: 80 },
    },
    {
      id: "node-5",
      type: "graph_store",
      name: "Neo4j Knowledge Graph",
      config: {
        provider: "neo4j",
        uri: "bolt://localhost:7687",
        database: "support_graph",
        entityExtraction: true,
        relationExtraction: true,
      },
      position: { x: 800, y: 260 },
    },
    {
      id: "node-6",
      type: "retriever",
      name: "Hybrid Retriever",
      config: {
        strategy: "hybrid",
        vectorWeight: 0.7,
        graphWeight: 0.3,
        topK: 10,
        scoreThreshold: 0.75,
      },
      position: { x: 1050, y: 170 },
    },
    {
      id: "node-7",
      type: "reranker",
      name: "Cross-Encoder Reranker",
      config: {
        model: "cross-encoder/ms-marco-MiniLM-L-12-v2",
        topK: 5,
        batchSize: 32,
      },
      position: { x: 1300, y: 170 },
    },
    {
      id: "node-8",
      type: "llm",
      name: "GPT-4o",
      config: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.1,
        maxTokens: 2048,
        systemPrompt: "You are a helpful customer support assistant...",
        apiKeyEnv: "OPENAI_API_KEY",
      },
      position: { x: 1550, y: 170 },
    },
    {
      id: "node-9",
      type: "evaluation",
      name: "RAGAS Evaluator",
      config: {
        framework: "ragas",
        metrics: ["faithfulness", "answer_relevancy", "context_precision", "context_recall"],
        testDataset: "s3://eval-data/support_qa.json",
        numSamples: 100,
      },
      position: { x: 1800, y: 170 },
    },
  ],
  edges: [
    { id: "e1-2", source: "node-1", target: "node-2" },
    { id: "e2-3", source: "node-2", target: "node-3" },
    { id: "e3-4", source: "node-3", target: "node-4" },
    { id: "e3-5", source: "node-3", target: "node-5" },
    { id: "e4-6", source: "node-4", target: "node-6" },
    { id: "e5-6", source: "node-5", target: "node-6" },
    { id: "e6-7", source: "node-6", target: "node-7" },
    { id: "e7-8", source: "node-7", target: "node-8" },
    { id: "e8-9", source: "node-8", target: "node-9" },
  ],
  createdAt: "2026-02-18T10:00:00Z",
  updatedAt: "2026-02-23T15:30:00Z",
};

export const mockSystems: SystemDefinition[] = [
  mockSystemDefinition,
  {
    id: "sys-002-uuid-aaaa-bbbb-ccccddddeeee",
    projectId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "Vector-Only RAG v1",
    version: 1,
    nodes: mockSystemDefinition.nodes.filter((n) => n.type !== "graph_store"),
    edges: mockSystemDefinition.edges.filter(
      (e) => e.source !== "node-5" && e.target !== "node-5"
    ),
    createdAt: "2026-02-12T08:00:00Z",
    updatedAt: "2026-02-14T12:00:00Z",
  },
];
