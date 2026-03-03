import { z } from "zod";
import { UUIDSchema, TimestampSchema } from "./common.schema";

// ============================================================
// System Designer Schemas
// ============================================================

export const NodeTypeSchema = z.enum([
  "document_loader",
  "chunker",
  "embedder",
  "vector_store",
  "graph_store",
  "retriever",
  "reranker",
  "llm",
  "evaluation",
]);

export const SystemNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  name: z.string(),
  config: z.record(z.unknown()),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  codeComponentId: z.string().uuid().nullish(),
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
});

export const SystemEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

export const SystemDefinitionSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  name: z.string().min(1),
  version: z.number().int().min(1),
  nodes: z.array(SystemNodeSchema),
  edges: z.array(SystemEdgeSchema),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const SystemListSchema = z.array(SystemDefinitionSchema);

/** Light summary used in dropdown selectors (all systems across all projects). */
export const SystemSummarySchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  projectName: z.string(),
  name: z.string(),
  version: z.number().int().min(1),
  updatedAt: TimestampSchema,
});

export const SystemSummaryListSchema = z.array(SystemSummarySchema);

export type SystemNodeOutput = z.infer<typeof SystemNodeSchema>;
export type SystemEdgeOutput = z.infer<typeof SystemEdgeSchema>;
export type SystemDefinitionOutput = z.infer<typeof SystemDefinitionSchema>;
export type SystemSummaryOutput = z.infer<typeof SystemSummarySchema>;
