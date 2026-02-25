import { useQuery, useMutation, type UseQueryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../api/client";

// ============================================================
// Generic API Hook Factory
// ============================================================

/**
 * The backend wraps every response in { data: T, success: bool, message?: string, pagination?: ... }.
 * We unwrap `.data` before passing to the domain schema parser so that schemas stay clean
 * (e.g. ProjectListSchema = z.array(ProjectSchema), not ApiResponseSchema(z.array(...))).
 */
function unwrapEnvelope(response: unknown): unknown {
  if (
    response !== null &&
    typeof response === "object" &&
    "data" in (response as Record<string, unknown>) &&
    "success" in (response as Record<string, unknown>)
  ) {
    return (response as Record<string, unknown>).data;
  }
  // Fallback: return as-is (e.g. during mock data phase)
  return response;
}

export const useApiQuery = <T>({
  queryKey,
  url,
  schema,
  enabled = true,
  refetchInterval,
}: {
  queryKey: string[];
  url: string;
  schema: z.ZodType<T>;
  enabled?: boolean;
  refetchInterval?: number | false;
}) => {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get(url);
      const data = unwrapEnvelope(response);
      return schema.parse(data);
    },
    enabled,
    refetchInterval,
  });
};

export const useApiMutation = <TInput, TOutput>({
  url,
  method = "POST",
  schema,
}: {
  url: string;
  method?: "POST" | "PUT" | "DELETE";
  schema: z.ZodType<TOutput>;
}) => {
  return useMutation({
    mutationFn: async (data: TInput) => {
      let response: unknown;
      switch (method) {
        case "POST":
          response = await apiClient.post(url, data);
          break;
        case "PUT":
          response = await apiClient.put(url, data);
          break;
        case "DELETE":
          response = await apiClient.delete(url);
          break;
      }
      const unwrapped = unwrapEnvelope(response);
      return schema.parse(unwrapped);
    },
  });
};
