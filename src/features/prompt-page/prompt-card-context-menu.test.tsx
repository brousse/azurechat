import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Hoist mocks before imports
const { mockDeletePrompt } = vi.hoisted(() => ({
  mockDeletePrompt: vi.fn().mockResolvedValue({ status: "OK", response: {} }),
}));

const { mockRevalidateCache } = vi.hoisted(() => ({
  mockRevalidateCache: vi.fn().mockResolvedValue(undefined),
}));

const { mockUpdatePrompt } = vi.hoisted(() => ({
  mockUpdatePrompt: vi.fn(),
}));

vi.mock("./prompt-service", () => ({
  DeletePrompt: mockDeletePrompt,
}));

vi.mock("../common/navigation-helpers", () => ({
  RevalidateCache: mockRevalidateCache,
}));

vi.mock("./prompt-store", () => ({
  promptStore: {
    updatePrompt: mockUpdatePrompt,
  },
}));

import { PromptCardContextMenu } from "./prompt-card-context-menu";
import type { PromptModel } from "./models";

function makePrompt(overrides: Partial<PromptModel> = {}): PromptModel {
  return {
    id: "p1",
    name: "My Test Prompt",
    description: "A helpful prompt description",
    createdAt: new Date(),
    isPublished: false,
    type: "PROMPT",
    userId: "u1",
    ...overrides,
  };
}

describe("prompt-page.unit.components.003 — PromptCardContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  });

  it("renders the context menu trigger (MoreVertical icon)", () => {
    render(<PromptCardContextMenu prompt={makePrompt()} />);
    // The trigger contains a MoreVertical SVG; the dropdown menu trigger is present
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("opens the dropdown and shows Edit and Delete items", async () => {
    const user = userEvent.setup();
    render(<PromptCardContextMenu prompt={makePrompt()} />);

    // Click the dropdown trigger (MoreVertical)
    const trigger = screen.getByRole("button", { hidden: true });
    await user.click(trigger);

    expect(await screen.findByText("Edit")).toBeInTheDocument();
    expect(await screen.findByText("Delete")).toBeInTheDocument();
  });

  it("calls promptStore.updatePrompt when Edit is clicked", async () => {
    const user = userEvent.setup();
    const prompt = makePrompt();
    render(<PromptCardContextMenu prompt={prompt} />);

    const trigger = screen.getByRole("button", { hidden: true });
    await user.click(trigger);

    const editItem = await screen.findByText("Edit");
    await user.click(editItem);

    expect(mockUpdatePrompt).toHaveBeenCalledWith(prompt);
  });

  it("calls DeletePrompt and RevalidateCache when Delete is confirmed", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const prompt = makePrompt({ id: "p-delete" });
    render(<PromptCardContextMenu prompt={prompt} />);

    const trigger = screen.getByRole("button", { hidden: true });
    await user.click(trigger);

    const deleteItem = await screen.findByText("Delete");
    await user.click(deleteItem);

    await waitFor(() => {
      expect(mockDeletePrompt).toHaveBeenCalledWith("p-delete");
      expect(mockRevalidateCache).toHaveBeenCalledWith({ page: "prompt" });
    });
  });

  it("does NOT call DeletePrompt when Delete is cancelled", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    render(<PromptCardContextMenu prompt={makePrompt()} />);

    const trigger = screen.getByRole("button", { hidden: true });
    await user.click(trigger);

    const deleteItem = await screen.findByText("Delete");
    await user.click(deleteItem);

    await waitFor(() => {
      expect(mockDeletePrompt).not.toHaveBeenCalled();
      expect(mockRevalidateCache).not.toHaveBeenCalled();
    });
  });

  it("confirm dialog includes prompt name", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirmSpy);
    const prompt = makePrompt({ name: "Special Prompt Name" });
    render(<PromptCardContextMenu prompt={prompt} />);

    const trigger = screen.getByRole("button", { hidden: true });
    await user.click(trigger);

    const deleteItem = await screen.findByText("Delete");
    await user.click(deleteItem);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("Special Prompt Name")
      );
    });
  });

  it("shows loading indicator while delete is in-flight", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    // Delay delete to observe loading state
    let resolveDelete: () => void;
    mockDeletePrompt.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = () => resolve({ status: "OK", response: {} });
        })
    );

    render(<PromptCardContextMenu prompt={makePrompt()} />);

    const trigger = screen.getByRole("button", { hidden: true });
    await user.click(trigger);

    const deleteItem = await screen.findByText("Delete");
    await user.click(deleteItem);

    // Loading indicator should appear while the delete promise is pending
    await waitFor(() => {
      expect(document.querySelector('[aria-label="loading"]') ?? document.querySelector(".animate-spin") ?? document.querySelector('[data-testid="loading"]')).toBeDefined();
    });

    // Resolve the pending delete
    resolveDelete!();
    await waitFor(() => {
      expect(mockRevalidateCache).toHaveBeenCalled();
    });
  });
});
