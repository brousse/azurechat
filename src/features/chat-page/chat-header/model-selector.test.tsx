import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelSelector } from "./model-selector";

// Mock getAvailableModels to return deterministic results
vi.mock("../chat-services/models", async () => {
  const actual = await vi.importActual<typeof import("../chat-services/models")>("../chat-services/models");
  return {
    ...actual,
    getAvailableModels: vi.fn().mockResolvedValue(actual.MODEL_CONFIGS),
  };
});

vi.mock("@/features/common/services/logger", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
  logDebug: vi.fn(),
}));

describe("chat-page.unit.components.001 — ModelSelector", () => {
  const onModelChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the selected model name in the trigger button", async () => {
    const { MODEL_CONFIGS } = await import("../chat-services/models");
    const firstModelId = Object.keys(MODEL_CONFIGS)[0] as any;
    render(
      <ModelSelector
        selectedModel={firstModelId}
        onModelChange={onModelChange}
      />
    );

    await waitFor(() => {
      // After loading completes the trigger button should show the model name
      expect(
        screen.getByRole("button")
      ).toBeInTheDocument();
    });
  });

  it("shows 'Selected' badge for the currently-selected model after opening", async () => {
    const { MODEL_CONFIGS } = await import("../chat-services/models");
    const models = Object.values(MODEL_CONFIGS);
    if (models.length === 0) return;
    const selectedModel = models[0];

    render(
      <ModelSelector
        selectedModel={selectedModel.id as any}
        onModelChange={onModelChange}
      />
    );

    // Wait for loading to finish
    await waitFor(() =>
      expect(screen.queryByText("Loading models...")).not.toBeInTheDocument()
    );

    // Open the dropdown
    await userEvent.click(screen.getByRole("button"));

    // The selected badge should be visible
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("calls onModelChange when a model option is clicked", async () => {
    const { MODEL_CONFIGS } = await import("../chat-services/models");
    const models = Object.values(MODEL_CONFIGS);
    if (models.length < 2) return;
    const firstModel = models[0];
    const secondModel = models[1];

    render(
      <ModelSelector
        selectedModel={firstModel.id as any}
        onModelChange={onModelChange}
      />
    );

    await waitFor(() =>
      expect(screen.queryByText("Loading models...")).not.toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button"));
    // Click the second model
    const option = screen.getByText(secondModel.name);
    await userEvent.click(option);

    expect(onModelChange).toHaveBeenCalledWith(secondModel.id);
  });

  it("is disabled when the disabled prop is true", async () => {
    const { MODEL_CONFIGS } = await import("../chat-services/models");
    const firstModelId = Object.keys(MODEL_CONFIGS)[0] as any;
    render(
      <ModelSelector
        selectedModel={firstModelId}
        onModelChange={onModelChange}
        disabled
      />
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
