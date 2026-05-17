import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatHome } from "./chat-home";
import type { PersonaModel } from "../persona-page/persona-services/models";

// Mock sub-components that pull in heavy dependencies
vi.mock("../persona-page/agent-list", () => ({
  AgentList: ({ personas, initialFavoriteIds }: any) => (
    <div data-testid="agent-list">
      {personas.map((p: PersonaModel) => (
        <div key={p.id} data-testid="persona-card" data-id={p.id}>
          {p.name}
          {initialFavoriteIds.includes(p.id) && (
            <span data-testid="favorite-marker">★</span>
          )}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../persona-page/add-new-persona", () => ({
  AddNewPersona: () => <div data-testid="add-new-persona" />,
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("./news-article", () => ({
  NewsArticle: ({ newsArticle }: any) => (
    <article data-testid="news-article">{newsArticle.title}</article>
  ),
}));

vi.mock("./changelog", () => ({
  Changelog: () => <div data-testid="changelog" />,
}));

vi.mock("../theme/theme-config", () => ({
  AI_NAME: "TestAI",
  AI_DESCRIPTION: "Test AI Description",
}));

vi.mock("@/features/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/features/ui/hero", () => ({
  Hero: ({ title, description }: any) => (
    <div>
      <div>{title}</div>
      <p>{description}</p>
    </div>
  ),
}));

function makePersona(id: string, name: string): PersonaModel {
  return {
    id,
    name,
    description: `Desc ${name}`,
    personaMessage: "msg",
    createdAt: new Date(),
    isPublished: true,
    type: "PERSONA",
    userId: "u1",
    extensionIds: [],
  };
}

describe("chat-home-page.unit.001 — ChatHome renders persona cards", () => {
  it("renders both persona names", () => {
    const personas = [makePersona("p1", "Alice"), makePersona("p2", "Bob")];
    render(
      <ChatHome
        personas={personas}
        extensions={[]}
        news={[]}
        favoriteAgentIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});

describe("chat-home-page.unit.002 — ChatHome favorite agents highlighted", () => {
  it("marks favorite persona card with a marker and not the other", () => {
    const personas = [makePersona("a", "Agent A"), makePersona("b", "Agent B")];
    render(
      <ChatHome
        personas={personas}
        extensions={[]}
        news={[]}
        favoriteAgentIds={["a"]}
        currentUserId="u1"
      />
    );
    const markers = screen.getAllByTestId("favorite-marker");
    expect(markers).toHaveLength(1);
    // The favorite marker should be near the 'Agent A' text
    expect(markers[0].closest("[data-id='a']")).toBeTruthy();
  });
});
