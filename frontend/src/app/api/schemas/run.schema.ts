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
  metrics: MetricsSchema,
  configSnapshot: z.record(z.unknown()),
  status: RunStatusSchema,
  createdAt: TimestampSchema,
});

export const EvaluationRunListSchema = z.array(EvaluationRunSchema);

export const RunComparisonSchema = z.object({
  baselineRunId: UUIDSchema,
  comparedRunIds: z.array(UUIDSchema),
});

export type MetricsOutput = z.infer<typeof MetricsSchema>;
export type EvaluationRunOutput = z.infer<typeof EvaluationRunSchema>;
export type RunComparisonInput = z.infer<typeof RunComparisonSchema>;
