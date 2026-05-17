import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockDeletePersona } = vi.hoisted(() => ({
  mockDeletePersona: vi.fn().mockResolvedValue({ status: "OK" }),
}));

vi.mock("../persona-services/persona-service", () => ({
  DeletePersona: mockDeletePersona,
}));

const { mockUpdatePersona } = vi.hoisted(() => ({
  mockUpdatePersona: vi.fn(),
}));

vi.mock("../persona-store", () => ({
  personaStore: {
    updatePersona: mockUpdatePersona,
  },
}));

const { mockRevalidateCache } = vi.hoisted(() => ({
  mockRevalidateCache: vi.fn(),
}));

vi.mock("@/features/common/navigation-helpers", () => ({
  RevalidateCache: mockRevalidateCache,
}));

vi.mock("@/features/chat-page/chat-menu/chat-menu-item", () => ({
  DropdownMenuItemWithIcon: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import { PersonaCardContextMenu } from "./persona-card-context-menu";
import type { PersonaModel } from "../persona-services/models";

const persona: PersonaModel = {
  id: "p1",
  name: "TestPersona",
  description: "A test persona",
  personaMessage: "instructions",
  createdAt: new Date(),
  isPublished: false,
  type: "PERSONA",
  userId: "u1",
  extensionIds: [],
};

describe("persona-page.unit.components.004 — PersonaCardContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const openMenu = async () => {
    render(<PersonaCardContextMenu persona={persona} />);
    const trigger = screen.getByRole("button");
    await userEvent.click(trigger);
  };

  it("renders Edit and Delete options in the dropdown", async () => {
    await openMenu();
    expect(screen.getByText(/edit/i)).toBeInTheDocument();
    expect(screen.getByText(/delete/i)).toBeInTheDocument();
  });

  it("does NOT render a Publish option", () => {
    render(<PersonaCardContextMenu persona={persona} />);
    expect(screen.queryByText(/publish/i)).not.toBeInTheDocument();
  });

  it("clicking Edit calls personaStore.updatePersona with the persona", async () => {
    await openMenu();
    await userEvent.click(screen.getByText(/edit/i));
    expect(mockUpdatePersona).toHaveBeenCalledWith(persona);
  });

  // ── Delete: confirmed ─────────────────────────────────────────────────────

  it("calls DeletePersona and RevalidateCache when user confirms deletion", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    await openMenu();
    await userEvent.click(screen.getByText(/delete/i));
    await waitFor(() => {
      expect(mockDeletePersona).toHaveBeenCalledWith("p1");
    });
    expect(mockRevalidateCache).toHaveBeenCalledWith({ page: "persona" });
    expect(mockRevalidateCache).toHaveBeenCalledWith({ page: "agent" });
    vi.unstubAllGlobals();
  });

  it("shows confirmation dialog with persona name", async () => {
    const confirmSpy = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirmSpy);
    await openMenu();
    await userEvent.click(screen.getByText(/delete/i));
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("TestPersona")
      );
    });
    vi.unstubAllGlobals();
  });

  // ── Delete: cancelled ─────────────────────────────────────────────────────

  it("does NOT call DeletePersona when user cancels the confirmation dialog", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    await openMenu();
    await userEvent.click(screen.getByText(/delete/i));
    await waitFor(() => {
      expect(mockDeletePersona).not.toHaveBeenCalled();
    });
    expect(mockRevalidateCache).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does NOT call RevalidateCache when DeletePersona is skipped (cancel)", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    await openMenu();
    await userEvent.click(screen.getByText(/delete/i));
    await waitFor(() => {
      expect(mockRevalidateCache).not.toHaveBeenCalled();
    });
    vi.unstubAllGlobals();
  });
});
