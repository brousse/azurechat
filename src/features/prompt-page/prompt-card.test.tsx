import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PromptCard } from "./prompt-card";
import type { PromptModel } from "./models";

vi.mock("./prompt-card-context-menu", () => ({
  PromptCardContextMenu: () => <div data-testid="context-menu" />,
}));

function makePrompt(overrides: Partial<PromptModel> = {}): PromptModel {
  return {
    id: "p1",
    name: "My Prompt",
    description: "A helpful prompt",
    createdAt: new Date(),
    isPublished: false,
    type: "PROMPT",
    userId: "u1",
    ...overrides,
  };
}

describe("prompt-page.unit.components.002 — PromptCard", () => {
  it("renders the prompt name", () => {
    render(<PromptCard prompt={makePrompt()} showContextMenu={false} />);
    expect(screen.getByText("My Prompt")).toBeInTheDocument();
  });

  it("renders description (truncated at 100 chars)", () => {
    const longDesc = "A".repeat(120);
    render(
      <PromptCard prompt={makePrompt({ description: longDesc })} showContextMenu={false} />
    );
    // Should see truncated version ending with "..."
    expect(screen.getByText(/A{100}\.\.\./)).toBeInTheDocument();
  });

  it("renders full description when ≤ 100 chars", () => {
    render(<PromptCard prompt={makePrompt()} showContextMenu={false} />);
    expect(screen.getByText("A helpful prompt")).toBeInTheDocument();
  });

  it("shows context menu when showContextMenu is true", () => {
    render(<PromptCard prompt={makePrompt()} showContextMenu={true} />);
    expect(screen.getByTestId("context-menu")).toBeInTheDocument();
  });

  it("hides context menu when showContextMenu is false", () => {
    render(<PromptCard prompt={makePrompt()} showContextMenu={false} />);
    expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
  });
});
