import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Heavy sub-components are stubbed out
vi.mock("./persona-hero/persona-hero", () => ({
  PersonaHero: () => <div data-testid="persona-hero" />,
}));

vi.mock("./agent-list", () => ({
  AgentList: (props: any) => (
    <div
      data-testid="agent-list"
      data-show-context={String(props.showContextMenu)}
    />
  ),
}));

vi.mock("./add-new-persona", () => ({
  AddNewPersona: () => <div data-testid="add-new-persona" />,
}));

vi.mock("../ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

import { ChatPersonaPage } from "./persona-page";
import type { PersonaModel } from "./persona-services/models";
import type { ExtensionModel } from "../extensions-page/extension-services/models";

const makePersona = (overrides: Partial<PersonaModel> = {}): PersonaModel => ({
  id: "p1",
  name: "TestAgent",
  description: "desc",
  personaMessage: "msg",
  createdAt: new Date(),
  isPublished: false,
  type: "PERSONA",
  userId: "u1",
  extensionIds: [],
  ...overrides,
});

describe("persona-page.unit.components.010 — ChatPersonaPage", () => {
  it("renders hero, agent-list and add-new-persona", () => {
    render(
      <ChatPersonaPage
        personas={[makePersona()]}
        extensions={[]}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.getByTestId("persona-hero")).toBeInTheDocument();
    expect(screen.getByTestId("agent-list")).toBeInTheDocument();
    expect(screen.getByTestId("add-new-persona")).toBeInTheDocument();
  });

  it("passes showContextMenu=true to AgentList", () => {
    render(
      <ChatPersonaPage
        personas={[]}
        extensions={[]}
        initialFavoriteIds={[]}
        currentUserId="u1"
      />
    );
    expect(screen.getByTestId("agent-list").dataset.showContext).toBe("true");
  });
});
