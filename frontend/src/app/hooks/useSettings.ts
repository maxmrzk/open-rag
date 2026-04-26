import { useApiMutation, useApiQuery } from "./useApi";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import {
  ApiKeyListSchema,
  ApiKeySchema,
  CreateApiKeySchema,
  DefaultsSchema,
  UpdateDefaultsSchema,
} from "../api/schemas/settings.schema";
import type {
  ApiKeyOutput,
  CreateApiKeyInput,
  DefaultsOutput,
  UpdateDefaultsInput,
} from "../api/schemas/settings.schema";

export const settingsQueryKeys = {
  apiKeys: ["settings", "api-keys"] as const,
  defaults: ["settings", "defaults"] as const,
};

export const useApiKeys = () => {
  return useApiQuery({
    queryKey: [...settingsQueryKeys.apiKeys],
    url: "/settings/api-keys",
    schema: ApiKeyListSchema,
  });
};

export const useCreateApiKey = () => {
  return useApiMutation<CreateApiKeyInput, ApiKeyOutput>({
    url: "/settings/api-keys",
    method: "POST",
    schema: ApiKeySchema,
  });
};

export const useDeleteApiKey = (keyId: string) => {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/settings/api-keys/${keyId}`);
      if (
        response !== null &&
        typeof response === "object" &&
        "data" in (response as Record<string, unknown>)
      ) {
        return z.null().parse((response as Record<string, unknown>).data);
      }
      return z.null().parse(response);
    },
  });
};

export const useDefaults = () => {
  return useApiQuery({
    queryKey: [...settingsQueryKeys.defaults],
    url: "/settings/defaults",
    schema: DefaultsSchema,
  });
};

export const useUpdateDefaults = () => {
  return useApiMutation<UpdateDefaultsInput, DefaultsOutput>({
    url: "/settings/defaults",
    method: "PUT",
    schema: UpdateDefaultsSchema,
  });
};
