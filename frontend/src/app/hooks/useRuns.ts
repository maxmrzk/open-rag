import { useApiQuery } from "./useApi";
import { EvaluationRunListSchema } from "../api/schemas/run.schema";

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
