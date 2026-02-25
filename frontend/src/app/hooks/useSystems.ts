import { useApiQuery, useApiMutation } from "./useApi";
import {
  SystemDefinitionSchema,
  SystemListSchema,
} from "../api/schemas/system.schema";
import type {
  SystemDefinitionOutput,
  SystemNodeOutput,
  SystemEdgeOutput,
} from "../api/schemas/system.schema";

// ============================================================
// Systems Hook — Live backend integration
// ============================================================

export const useSystems = (projectId?: string) => {
  return useApiQuery({
    queryKey: ["systems", projectId ?? ""],
    url: `/projects/${projectId}/systems`,
    schema: SystemListSchema,
    enabled: !!projectId,
  });
};

export const useSystem = (systemId?: string) => {
  return useApiQuery({
    queryKey: ["system", systemId ?? ""],
    url: `/systems/${systemId}`,
    schema: SystemDefinitionSchema,
    enabled: !!systemId,
  });
};

export const useUpdateSystem = (systemId: string) => {
  return useApiMutation<
    { name: string; nodes: SystemNodeOutput[]; edges: SystemEdgeOutput[] },
    SystemDefinitionOutput
  >({
    url: `/systems/${systemId}`,
    method: "PUT",
    schema: SystemDefinitionSchema,
  });
};
