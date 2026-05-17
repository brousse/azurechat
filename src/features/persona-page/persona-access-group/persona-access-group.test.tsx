import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockAccessGroupById } = vi.hoisted(() => ({
  mockAccessGroupById: vi.fn(),
}));

vi.mock("../persona-services/access-group-service", () => ({
  AccessGroupById: mockAccessGroupById,
  UserAccessGroups: vi.fn().mockResolvedValue({ status: "OK", response: [] }),
}));

vi.mock("@/features/auth-page/logout-on-session-expired", () => ({
  logoutOnSessionExpired: vi.fn().mockReturnValue(false),
}));

vi.mock("./persona-access-group-selector", () => ({
  PersonaAccessGroupSelector: ({ onSelectGroup, selectedAccessGroupId }: any) => (
    <button
      data-testid="group-selector"
      data-selected={selectedAccessGroupId}
      onClick={() =>
        onSelectGroup({ id: "g99", name: "Test Group", description: "tg" })
      }
    >
      Select Group
    </button>
  ),
}));

vi.mock("@/features/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

import { PersonaAccessGroup } from "./persona-access-group";

describe("persona-page.unit.components.008 — PersonaAccessGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── No initial group ──────────────────────────────────────────────────────

  it("renders 'Everyone can view this agent' when no initial group", () => {
    render(<PersonaAccessGroup initialSelectedGroup={null} />);
    expect(screen.getByDisplayValue("Everyone can view this agent")).toBeInTheDocument();
  });

  it("Trash button is disabled when no group selected", () => {
    render(<PersonaAccessGroup initialSelectedGroup={null} />);
    // Find the trash button (ghost icon button)
    const buttons = screen.getAllByRole("button");
    // The first icon-button variant is the trash button
    const trashBtn = buttons.find((b) => b.hasAttribute("disabled"));
    expect(trashBtn).toBeDefined();
  });

  it("hidden accessGroupId input is empty when no group selected", () => {
    const { container } = render(
      <PersonaAccessGroup initialSelectedGroup={null} />
    );
    const hidden = container.querySelector<HTMLInputElement>(
      'input[name="accessGroupId"]'
    );
    expect(hidden?.value).toBe("");
  });

  // ── With initial group ────────────────────────────────────────────────────

  it("fetches group details and shows group name when initialSelectedGroup is provided", async () => {
    mockAccessGroupById.mockResolvedValue({
      status: "OK",
      response: { id: "g1", name: "Finance", description: "" },
    });
    render(<PersonaAccessGroup initialSelectedGroup="g1" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Finance")).toBeInTheDocument();
    });
    expect(mockAccessGroupById).toHaveBeenCalledWith("g1");
  });

  it("falls back to no group when fetch returns error", async () => {
    mockAccessGroupById.mockResolvedValue({
      status: "ERROR",
      errors: [{ message: "not found" }],
    });
    render(<PersonaAccessGroup initialSelectedGroup="g-bad" />);
    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Everyone can view this agent")
      ).toBeInTheDocument();
    });
  });

  // ── Selecting a group via selector ────────────────────────────────────────

  it("shows the newly selected group name after selector fires onSelectGroup", async () => {
    render(<PersonaAccessGroup initialSelectedGroup={null} />);
    await userEvent.click(screen.getByTestId("group-selector"));
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Group")).toBeInTheDocument();
    });
  });

  it("enables Trash button after a group is selected", async () => {
    render(<PersonaAccessGroup initialSelectedGroup={null} />);
    await userEvent.click(screen.getByTestId("group-selector"));
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const trashBtn = buttons.find(
        (b) => !b.hasAttribute("disabled") && b !== screen.getByTestId("group-selector")
      );
      expect(trashBtn).toBeDefined();
    });
  });

  it("clears group when Trash button is clicked", async () => {
    render(<PersonaAccessGroup initialSelectedGroup={null} />);
    // First select a group
    await userEvent.click(screen.getByTestId("group-selector"));
    await waitFor(() => screen.getByDisplayValue("Test Group"));

    // Click the first non-disabled button that isn't the selector — the trash icon
    const trashButtons = screen.getAllByRole("button").filter(
      (b) => !b.hasAttribute("disabled") && b !== screen.getByTestId("group-selector")
    );
    await userEvent.click(trashButtons[0]);
    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Everyone can view this agent")
      ).toBeInTheDocument();
    });
  });
});
