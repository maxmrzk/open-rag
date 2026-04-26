import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { apiClient } from "@/app/api/client";
import {
  useApiKeys,
  useCreateApiKey,
  useDefaults,
  useDeleteApiKey,
  useUpdateDefaults,
} from "@/app/hooks/useSettings";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("useSettings hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads API keys from envelope response", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: [
        {
          id: "5a75f6e3-539f-4cc8-a729-7521f245370f",
          name: "OPENAI_API_KEY",
          value: "sk-...abcd",
          lastUsed: null,
        },
      ],
    });

    const { result } = renderHook(() => useApiKeys(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.name).toBe("OPENAI_API_KEY");
  });

  it("creates and deletes API keys", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: {
        id: "5a75f6e3-539f-4cc8-a729-7521f245370f",
        name: "OPENAI_API_KEY",
        value: "sk-...abcd",
        lastUsed: null,
      },
    });
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, data: null });

    const { result: createResult } = renderHook(() => useCreateApiKey(), { wrapper: makeWrapper() });
    createResult.current.mutate({ name: "OPENAI_API_KEY", value: "sk-secret-value" });

    await waitFor(() => expect(createResult.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith("/settings/api-keys", {
      name: "OPENAI_API_KEY",
      value: "sk-secret-value",
    });

    const { result: deleteResult } = renderHook(
      () => useDeleteApiKey("5a75f6e3-539f-4cc8-a729-7521f245370f"),
      { wrapper: makeWrapper() }
    );
    deleteResult.current.mutate();

    await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true));
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/settings/api-keys/5a75f6e3-539f-4cc8-a729-7521f245370f"
    );
  });

  it("loads and updates defaults", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: {
        chunkSize: "512",
        chunkOverlap: "64",
        embeddingModel: "text-embedding-3-large",
        llmModel: "gpt-4o",
        temperature: "0.1",
        topK: "10",
      },
    });
    vi.mocked(apiClient.put).mockResolvedValue({
      success: true,
      data: {
        chunkSize: "1024",
        chunkOverlap: "64",
        embeddingModel: "text-embedding-3-large",
        llmModel: "gpt-4o",
        temperature: "0.1",
        topK: "10",
      },
    });

    const { result: defaultsResult } = renderHook(() => useDefaults(), { wrapper: makeWrapper() });
    await waitFor(() => expect(defaultsResult.current.isSuccess).toBe(true));
    expect(defaultsResult.current.data?.chunkSize).toBe("512");

    const { result: updateResult } = renderHook(() => useUpdateDefaults(), { wrapper: makeWrapper() });
    updateResult.current.mutate({
      chunkSize: "1024",
      chunkOverlap: "64",
      embeddingModel: "text-embedding-3-large",
      llmModel: "gpt-4o",
      temperature: "0.1",
      topK: "10",
    });

    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));
    expect(apiClient.put).toHaveBeenCalledWith("/settings/defaults", {
      chunkSize: "1024",
      chunkOverlap: "64",
      embeddingModel: "text-embedding-3-large",
      llmModel: "gpt-4o",
      temperature: "0.1",
      topK: "10",
    });
  });
});
