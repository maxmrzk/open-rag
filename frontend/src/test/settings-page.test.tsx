import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { SettingsPage } from "@/app/features/settings/settings-page";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

const {
  mockUseApiKeys,
  mockUseCreateApiKey,
  mockUseDeleteApiKey,
  mockUseDefaults,
  mockUseUpdateDefaults,
} = vi.hoisted(() => ({
  mockUseApiKeys: vi.fn(),
  mockUseCreateApiKey: vi.fn(),
  mockUseDeleteApiKey: vi.fn(),
  mockUseDefaults: vi.fn(),
  mockUseUpdateDefaults: vi.fn(),
}));

vi.mock("@/app/hooks/useSettings", () => ({
  settingsQueryKeys: {
    apiKeys: ["settings", "api-keys"],
    defaults: ["settings", "defaults"],
  },
  useApiKeys: () => mockUseApiKeys(),
  useCreateApiKey: () => mockUseCreateApiKey(),
  useDeleteApiKey: (id: string) => mockUseDeleteApiKey(id),
  useDefaults: () => mockUseDefaults(),
  useUpdateDefaults: () => mockUseUpdateDefaults(),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(createElement(QueryClientProvider, { client: queryClient }, ui));
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseApiKeys.mockReturnValue({
      data: [
        {
          id: "5a75f6e3-539f-4cc8-a729-7521f245370f",
          name: "OPENAI_API_KEY",
          value: "sk-...abcd",
          lastUsed: null,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    mockUseCreateApiKey.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });

    mockUseDeleteApiKey.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });

    mockUseDefaults.mockReturnValue({
      data: {
        chunkSize: "512",
        chunkOverlap: "64",
        embeddingModel: "text-embedding-3-large",
        llmModel: "gpt-4o",
        temperature: "0.1",
        topK: "10",
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    mockUseUpdateDefaults.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
  });

  it("renders API key rows", () => {
    renderWithQuery(<SettingsPage />);

    expect(screen.getByText("OPENAI_API_KEY")).toBeInTheDocument();
    expect(screen.getByText("sk-...abcd")).toBeInTheDocument();
  });

  it("validates and submits add key modal", async () => {
    const user = userEvent.setup();
    const createMutation = vi.fn().mockResolvedValue(undefined);
    mockUseCreateApiKey.mockReturnValue({
      mutateAsync: createMutation,
      isPending: false,
    });

    renderWithQuery(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: "+ Add Key" }));
    await user.type(screen.getByPlaceholderText("e.g., OPENAI_API_KEY"), "openai_api_key");

    expect(
      screen.getByText("Use uppercase env-var format (e.g. OPENAI_API_KEY).")
    ).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("e.g., OPENAI_API_KEY"));
    await user.type(screen.getByPlaceholderText("e.g., OPENAI_API_KEY"), "OPENAI_API_KEY");
    await user.type(screen.getByPlaceholderText("Paste secret value"), "sk-secret");
    await user.click(screen.getByRole("button", { name: "Save API Key" }));

    await waitFor(() => {
      expect(createMutation).toHaveBeenCalledWith({ name: "OPENAI_API_KEY", value: "sk-secret" });
    });
    expect(toastSuccess).toHaveBeenCalledWith("API key stored");
  });

  it("confirms and revokes an API key", async () => {
    const user = userEvent.setup();
    const deleteMutation = vi.fn().mockResolvedValue(undefined);
    mockUseDeleteApiKey.mockReturnValue({
      mutateAsync: deleteMutation,
      isPending: false,
    });

    renderWithQuery(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: "Revoke" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(deleteMutation).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith("Revoked OPENAI_API_KEY");
  });

  it("tracks defaults dirty state and reset", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: "Default Configs" }));

    const saveButton = screen.getByRole("button", { name: "Save Defaults" });
    const resetButton = screen.getByRole("button", { name: "Reset" });
    expect(saveButton).toBeDisabled();
    expect(resetButton).toBeDisabled();

    const chunkSizeInput = screen.getByDisplayValue("512");
    await user.clear(chunkSizeInput);
    await user.type(chunkSizeInput, "1024");

    expect(saveButton).toBeEnabled();
    expect(resetButton).toBeEnabled();

    await user.click(resetButton);

    expect(screen.getByDisplayValue("512")).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });
});
