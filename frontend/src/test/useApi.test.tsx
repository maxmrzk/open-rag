/**
 * Tests for the useApi envelope-unwrapping logic.
 * We test the exported unwrap logic by exercising the mutation/query factories
 * with a mocked apiClient.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// We test `unwrapEnvelope` indirectly by monkey-patching apiClient and calling
// useApiQuery / useApiMutation through renderHook.
// ─────────────────────────────────────────────────────────────────────────────

// Mock the API client module before importing hooks
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
import { z } from "zod";
import { apiClient } from "@/app/api/client";
import { useApiQuery, useApiMutation } from "@/app/hooks/useApi";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("unwrapEnvelope via useApiQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps { data, success } envelope before schema parse", async () => {
    const Schema = z.array(z.object({ id: z.string() }));
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: "abc" }], success: true });

    const { result } = renderHook(
      () => useApiQuery({ queryKey: ["test"], url: "/test", schema: Schema }),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "abc" }]);
  });

  it("falls back gracefully when response is not an envelope", async () => {
    const Schema = z.array(z.object({ id: z.string() }));
    // Raw array (no envelope — mock data pattern)
    vi.mocked(apiClient.get).mockResolvedValue([{ id: "xyz" }]);

    const { result } = renderHook(
      () => useApiQuery({ queryKey: ["test2"], url: "/test2", schema: Schema }),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "xyz" }]);
  });

  it("is disabled when enabled=false", () => {
    const Schema = z.array(z.string());
    const { result } = renderHook(
      () => useApiQuery({ queryKey: ["disabled"], url: "/x", schema: Schema, enabled: false }),
      { wrapper: makeWrapper() }
    );
    // Should never fire
    expect(result.current.isFetching).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("surfaces fetch errors", async () => {
    const Schema = z.array(z.string());
    vi.mocked(apiClient.get).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(
      () => useApiQuery({ queryKey: ["err"], url: "/fail", schema: Schema }),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("Network error");
  });
});

describe("useApiMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST mutation calls apiClient.post and unwraps envelope", async () => {
    const Schema = z.object({ id: z.string(), name: z.string() });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: "1", name: "Created" },
      success: true,
    });

    const { result } = renderHook(
      () =>
        useApiMutation<{ name: string }, z.infer<typeof Schema>>({ url: "/items", schema: Schema }),
      { wrapper: makeWrapper() }
    );

    result.current.mutate({ name: "Created" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe("Created");
  });

  it("propagates mutation errors", async () => {
    const Schema = z.object({ id: z.string() });
    vi.mocked(apiClient.post).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(
      () => useApiMutation<object, z.infer<typeof Schema>>({ url: "/fail", schema: Schema }),
      { wrapper: makeWrapper() }
    );

    result.current.mutate({});
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
