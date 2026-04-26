import { z } from "zod";
import { UUIDSchema, TimestampSchema } from "./common.schema";

// ============================================================
// Evaluation Run Schemas
// ============================================================

export const MetricsSchema = z.object({
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  mrr: z.number().min(0).max(1),
  latencyMs: z.number().min(0),
  tokenUsage: z.number().int().min(0),
  costUsd: z.number().min(0),
  hallucinationScore: z.number().min(0).max(1),
});

export const RunStatusSchema = z.enum(["completed", "running", "failed"]);

export const EvaluationRunSchema = z.object({
  id: UUIDSchema,
  systemId: UUIDSchema,
  systemName: z.string(),
  projectId: UUIDSchema.nullish(),
  projectName: z.string().default(""),
  promptInput: z.string().nullish(),
  metrics: MetricsSchema,
  configSnapshot: z.record(z.unknown()),
  status: RunStatusSchema,
  errorMessage: z.string().nullish(),
  output: z.record(z.unknown()).nullish(),
  retrievalTrace: z.array(z.record(z.unknown())).default([]),
  metricsDetail: z.record(z.unknown()).default({}),
  startedAt: TimestampSchema.nullish(),
  completedAt: TimestampSchema.nullish(),
  createdAt: TimestampSchema,
});

export const EvaluationRunListSchema = z.array(EvaluationRunSchema);

export const RunComparisonSchema = z.object({
  baselineRunId: UUIDSchema,
  comparedRunIds: z.array(UUIDSchema),
});

export const RunCreateSchema = z.object({
  promptInput: z.string().nullish(),
});

export type MetricsOutput = z.infer<typeof MetricsSchema>;
export type EvaluationRunOutput = z.infer<typeof EvaluationRunSchema>;
export type RunComparisonInput = z.infer<typeof RunComparisonSchema>;
export type RunCreateInput = z.infer<typeof RunCreateSchema>;
