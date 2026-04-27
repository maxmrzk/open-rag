// ============================================================
// Core Domain Types for RAG System Builder
// ============================================================

export type NodeType =
  | "document_loader"
  | "chunker"
  | "embedder"
  | "vector_store"
  | "graph_store"
  | "retriever"
  | "reranker"
  | "llm"
  | "evaluation";

// Which node types REQUIRE custom Python code (vs. library imports / config only)
export const CODE_REQUIRED_NODES: NodeType[] = [
  "document_loader",
  "chunker",
  "embedder",
  "retriever",
  "llm",
  "evaluation",
];

// Which node types use HuggingFace / library imports (no raw Python needed)
export const IMPORT_NODES: NodeType[] = ["reranker", "graph_store"];

export interface SystemNode {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  /** Reference to a CodeComponent in the library */
  codeComponentId?: string;
  /** Edge IDs flowing INTO this node */
  inputs?: string[];
  /** Edge IDs flowing OUT of this node */
  outputs?: string[];
}

export interface SystemEdge {
  id: string;
  source: string;
  target: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  systemCount: number;
  runCount: number;
}

export interface SystemDefinition {
  id: string;
  projectId: string;
  name: string;
  version: number;
  nodes: SystemNode[];
  edges: SystemEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface Metrics {
  precision: number;
  recall: number;
  mrr: number;
  latencyMs: number;
  tokenUsage: number;
  costUsd: number;
  hallucinationScore: number;
}

export interface EvaluationRun {
  id: string;
  systemId: string;
  systemName: string;
  projectId?: string | null;
  projectName: string;
  promptInput?: string | null;
  metrics: Metrics;
  configSnapshot: Record<string, unknown>;
  status: "completed" | "running" | "failed";
  errorMessage?: string | null;
  output?: Record<string, unknown> | null;
  retrievalTrace?: Record<string, unknown>[];
  metricsDetail?: Record<string, unknown>;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface SystemSummary {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  version: number;
  updatedAt: string;
}

export interface RunComparison {
  baselineRunId: string;
  comparedIds: string[];
}

export type NavigationItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
};

// ============================================================
// Component Library Types
// ============================================================

export type ComponentProvider =
  | "openai"
  | "google"
  | "anthropic"
  | "cohere"
  | "huggingface"
  | "langchain"
  | "custom";

export interface CodeComponent {
  id: string;
  name: string;
  description: string;
  nodeType: NodeType;
  provider?: ComponentProvider;
  language: "python";
  code: string;
  isDefault: boolean;
  isBuiltin: boolean;
  tags: string[];
  /** pip packages needed */
  requirements?: string[];
  /** Environment variables needed */
  envVars?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// System Export / Persistence
// ============================================================

export interface SystemExport {
  version: "1.0";
  exportedAt: string;
  system: {
    name: string;
    nodes: SystemNode[];
    edges: SystemEdge[];
  };
  /** Code components referenced by this system */
  components: CodeComponent[];
}
