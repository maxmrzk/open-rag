import { useApiQuery, useApiMutation } from "./useApi";
import {
  EvaluationRunListSchema,
  EvaluationRunSchema,
  RunCreateSchema,
} from "../api/schemas/run.schema";
import type { RunCreateInput, EvaluationRunOutput } from "../api/schemas/run.schema";

// ============================================================
// Runs Hook — Live backend integration
// ============================================================

export const useRuns = (systemId?: string, options?: { refetchInterval?: number | false }) => {
  return useApiQuery({
    queryKey: ["runs", systemId ?? ""],
    url: `/systems/${systemId}/runs`,
    schema: EvaluationRunListSchema,
    enabled: !!systemId,
    refetchInterval: options?.refetchInterval,
  });
};

export const useAllRuns = (options?: { refetchInterval?: number | false }) => {
  return useApiQuery({
    queryKey: ["runs", "all"],
    url: `/runs`,
    schema: EvaluationRunListSchema,
    refetchInterval: options?.refetchInterval,
  });
};

export const useProjectRuns = (
  projectId?: string,
  options?: { refetchInterval?: number | false }
) => {
  return useApiQuery({
    queryKey: ["runs", "project", projectId ?? ""],
    url: `/projects/${projectId}/runs`,
    schema: EvaluationRunListSchema,
    enabled: !!projectId,
    refetchInterval: options?.refetchInterval,
  });
};

export const useCreateRun = (systemId: string) => {
  return useApiMutation<RunCreateInput, EvaluationRunOutput>({
    url: `/systems/${systemId}/runs`,
    method: "POST",
    schema: EvaluationRunSchema,
  });
};

export const useRunComparison = (baselineId?: string, comparedIds?: string[]) => {
  const params =
    comparedIds && comparedIds.length > 0
      ? comparedIds.map((id) => `compared=${id}`).join("&")
      : "";
  return useApiQuery({
    queryKey: ["run-comparison", baselineId ?? "", ...(comparedIds ?? [])],
    url: `/runs/compare?baseline=${baselineId}&${params}`,
    schema: EvaluationRunListSchema,
    enabled: !!baselineId && (comparedIds?.length ?? 0) > 0,
  });
};
