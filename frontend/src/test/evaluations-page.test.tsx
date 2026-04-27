import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { createElement } from "react";
import { EvaluationsPage } from "@/app/features/evaluations/evaluations-page";

const mockUseRuns = vi.fn();
const mockUseAllRuns = vi.fn();
const mockUseRunComparison = vi.fn();
const mockUseAllSystems = vi.fn();

vi.mock("@/app/hooks/useRuns", () => ({
  useRuns: (...args: unknown[]) => mockUseRuns(...args),
  useAllRuns: (...args: unknown[]) => mockUseAllRuns(...args),
  useRunComparison: (...args: unknown[]) => mockUseRunComparison(...args),
}));

vi.mock("@/app/hooks/useSystems", () => ({
  useAllSystems: (...args: unknown[]) => mockUseAllSystems(...args),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    createElement(MemoryRouter, {}, createElement(QueryClientProvider, { client: queryClient }, ui))
  );
}

describe("EvaluationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAllSystems.mockReturnValue({
      data: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          projectId: "22222222-2222-4222-8222-222222222222",
          projectName: "Project A",
          name: "System A",
          version: 1,
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const runs = [
      {
        id: "33333333-3333-4333-8333-333333333333",
        systemId: "11111111-1111-4111-8111-111111111111",
        systemName: "System A",
        projectId: "22222222-2222-4222-8222-222222222222",
        projectName: "Project A",
        promptInput: "hello",
        metrics: {
          precision: 0.9,
          recall: 0.8,
          mrr: 0.7,
          latencyMs: 210,
          tokenUsage: 1200,
          costUsd: 0.02,
          hallucinationScore: 0.1,
        },
        configSnapshot: {},
        status: "completed",
        errorMessage: null,
        output: null,
        retrievalTrace: [],
        metricsDetail: {},
        startedAt: null,
        completedAt: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        systemId: "11111111-1111-4111-8111-111111111111",
        systemName: "System A",
        projectId: "22222222-2222-4222-8222-222222222222",
        projectName: "Project A",
        promptInput: "world",
        metrics: {
          precision: 0.85,
          recall: 0.75,
          mrr: 0.65,
          latencyMs: 300,
          tokenUsage: 1600,
          costUsd: 0.03,
          hallucinationScore: 0.12,
        },
        configSnapshot: {},
        status: "completed",
        errorMessage: null,
        output: null,
        retrievalTrace: [],
        metricsDetail: {},
        startedAt: null,
        completedAt: null,
        createdAt: "2026-01-01T01:00:00Z",
      },
    ];

    mockUseRuns.mockReturnValue({ data: runs, isLoading: false, isError: false });
    mockUseAllRuns.mockReturnValue({ data: runs, isLoading: false, isError: false });
    mockUseRunComparison.mockReturnValue({ data: runs });
  });

  it("renders table rows", () => {
    renderWithProviders(<EvaluationsPage />);
    expect(screen.getAllByText("System A").length).toBeGreaterThan(0);
  });

  it("shows comparison chart after selecting two completed runs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvaluationsPage />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText("Metrics Comparison")).toBeInTheDocument();
    });
  });

  it("expands row details to show output and retrieval trace", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvaluationsPage />);

    await user.click(screen.getAllByLabelText("Expand run details")[0]);

    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByText("Retrieval Trace")).toBeInTheDocument();
    expect(screen.getByText("Download JSON")).toBeInTheDocument();
  });
});
