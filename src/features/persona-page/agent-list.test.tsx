import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./persona-card/persona-card", () => ({
  PersonaCard: ({ persona, isFavorited, showActionMenu }: any) => (
    <div
      data-testid={`card-${persona.id}`}
      data-favorited={String(isFavorited)}
      data-show-action={String(showActionMenu)}
    >
      {persona.name}
    </div>
  ),
}));

import { AgentList } from "./agent-list";
import type { PersonaModel } from "./persona-services/models";

const makePersona = (overrides: Partial<PersonaModel> = {}): PersonaModel => ({
  id: "p1",
  name: "Agent One",
  description: "First agent",
  personaMessage: "msg",
  createdAt: new Date(),
  isPublished: false,
  type: "PERSONA",
  userId: "u1",
  extensionIds: [],
  ...overrides,
});

describe("persona-page.unit.components.005 — AgentList", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders 'Agents' heading when no favourites", () => {
    render(
      <AgentList
        personas={[makePersona()]}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.getByText("Agents")).toBeInTheDocument();
  });

  it("renders 'No agents found.' when persona list is empty", () => {
    render(
      <AgentList
        personas={[]}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.getByText("No agents found.")).toBeInTheDocument();
  });

  it("renders a PersonaCard per persona", () => {
    const personas = [
      makePersona({ id: "a", name: "Alpha" }),
      makePersona({ id: "b", name: "Beta" }),
    ];
    render(
      <AgentList
        personas={personas}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.getByTestId("card-a")).toBeInTheDocument();
    expect(screen.getByTestId("card-b")).toBeInTheDocument();
  });

  // ── Favourites section ─────────────────────────────────────────────────────

  it("shows 'Favorites' section and 'All Agents' heading when initial favourite IDs are given", () => {
    const personas = [
      makePersona({ id: "fav", name: "Favoured" }),
      makePersona({ id: "nfav", name: "Not Favoured" }),
    ];
    render(
      <AgentList
        personas={personas}
        initialFavoriteIds={["fav"]}
        currentUserId="u1"
      />
    );
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("All Agents")).toBeInTheDocument();
    expect(screen.getByTestId("card-fav").dataset.favorited).toBe("true");
    expect(screen.getByTestId("card-nfav").dataset.favorited).toBe("false");
  });

  it("does NOT render Favorites section when no initial favourite IDs", () => {
    render(
      <AgentList
        personas={[makePersona()]}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
  });

  // ── Ownership: showActionMenu ──────────────────────────────────────────────

  it("passes showActionMenu=true only for personas owned by currentUserId", () => {
    const personas = [
      makePersona({ id: "mine", userId: "u1" }),
      makePersona({ id: "theirs", userId: "u2" }),
    ];
    render(
      <AgentList
        personas={personas}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.getByTestId("card-mine").dataset.showAction).toBe("true");
    expect(screen.getByTestId("card-theirs").dataset.showAction).toBe("false");
  });

  // ── Search ─────────────────────────────────────────────────────────────────

  it("filters personas by name search", async () => {
    const personas = [
      makePersona({ id: "a", name: "Alpha Agent", description: "first" }),
      makePersona({ id: "b", name: "Beta Agent", description: "second" }),
    ];
    render(
      <AgentList
        personas={personas}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    const searchInput = screen.getByPlaceholderText(
      /search agents by name or description/i
    );
    await userEvent.type(searchInput, "Alpha");
    expect(screen.getByTestId("card-a")).toBeInTheDocument();
    expect(screen.queryByTestId("card-b")).not.toBeInTheDocument();
  });

  it("filters personas by description search", async () => {
    const personas = [
      makePersona({ id: "a", name: "Agent A", description: "translator role" }),
      makePersona({ id: "b", name: "Agent B", description: "coder role" }),
    ];
    render(
      <AgentList
        personas={personas}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    await userEvent.type(
      screen.getByPlaceholderText(/search agents/i),
      "translator"
    );
    expect(screen.getByTestId("card-a")).toBeInTheDocument();
    expect(screen.queryByTestId("card-b")).not.toBeInTheDocument();
  });

  it("shows 'No agents match your search.' when search yields nothing", async () => {
    render(
      <AgentList
        personas={[makePersona({ name: "Alpha" })]}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    await userEvent.type(screen.getByPlaceholderText(/search agents/i), "zzz");
    expect(
      screen.getByText("No agents match your search.")
    ).toBeInTheDocument();
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  it("does NOT render pagination when personas fit on one page", () => {
    render(
      <AgentList
        personas={[makePersona()]}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  it("renders pagination controls when more than PAGE_SIZE (12) personas", () => {
    const many = Array.from({ length: 13 }, (_, i) =>
      makePersona({ id: `p${i}`, name: `Agent ${i}` })
    );
    render(
      <AgentList
        personas={many}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
  });

  it("advances to page 2 when Next is clicked", async () => {
    const many = Array.from({ length: 13 }, (_, i) =>
      makePersona({ id: `p${i}`, name: `Agent ${i}` })
    );
    render(
      <AgentList
        personas={many}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
  });

  it("Previous button is disabled on first page", () => {
    const many = Array.from({ length: 13 }, (_, i) =>
      makePersona({ id: `p${i}`, name: `Agent ${i}` })
    );
    render(
      <AgentList
        personas={many}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  it("Next button is disabled on last page", async () => {
    const many = Array.from({ length: 13 }, (_, i) =>
      makePersona({ id: `p${i}`, name: `Agent ${i}` })
    );
    render(
      <AgentList
        personas={many}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("resets to page 1 when search query changes", async () => {
    const many = Array.from({ length: 13 }, (_, i) =>
      makePersona({ id: `p${i}`, name: `Agent ${i}` })
    );
    render(
      <AgentList
        personas={many}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    // Go to page 2
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
    // Type a search that narrows results to 1 → pagination disappears (totalPages = 1),
    // confirming the displayed page collapses back to 1 via the safePage clamp.
    await userEvent.type(screen.getByPlaceholderText(/search agents/i), "Agent 0");
    expect(screen.queryByText(/page 2/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("card-p0")).toBeInTheDocument();
  });
});
