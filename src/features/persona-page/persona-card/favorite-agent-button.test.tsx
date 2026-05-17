import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FavoriteAgentButton } from "./favorite-agent-button";

vi.mock("../persona-services/agent-favorite-service", () => ({
  ToggleFavoriteAgent: vi.fn().mockResolvedValue({ status: "OK", response: [] }),
}));

describe("persona-page.unit.components.003 — FavoriteAgentButton", () => {
  const onToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Add to favorites' aria-label when not favorited", () => {
    render(
      <FavoriteAgentButton agentId="a1" isFavorited={false} onToggle={onToggle} />
    );
    expect(
      screen.getByRole("button", { name: /add to favorites/i })
    ).toBeInTheDocument();
  });

  it("shows 'Remove from favorites' aria-label when favorited", () => {
    render(
      <FavoriteAgentButton agentId="a1" isFavorited={true} onToggle={onToggle} />
    );
    expect(
      screen.getByRole("button", { name: /remove from favorites/i })
    ).toBeInTheDocument();
  });

  it("calls onToggle with agentId when clicked", async () => {
    render(
      <FavoriteAgentButton agentId="a1" isFavorited={false} onToggle={onToggle} />
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith("a1");
  });

  it("calls ToggleFavoriteAgent server action when clicked", async () => {
    const { ToggleFavoriteAgent } = await import(
      "../persona-services/agent-favorite-service"
    );
    render(
      <FavoriteAgentButton agentId="a2" isFavorited={false} onToggle={onToggle} />
    );
    await userEvent.click(screen.getByRole("button"));
    expect(ToggleFavoriteAgent).toHaveBeenCalledWith("a2");
  });
});
