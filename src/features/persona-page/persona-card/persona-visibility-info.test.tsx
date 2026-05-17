import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockAccessGroupById } = vi.hoisted(() => ({
  mockAccessGroupById: vi.fn(),
}));

vi.mock("../persona-services/access-group-service", () => ({
  AccessGroupById: mockAccessGroupById,
}));

vi.mock("@/features/auth-page/logout-on-session-expired", () => ({
  logoutOnSessionExpired: vi.fn().mockReturnValue(false),
}));

vi.mock("@/features/ui/tooltip", () => ({
  Tooltip: ({ children, onOpenChange }: any) => (
    <div
      data-testid="tooltip-root"
      onMouseEnter={() => onOpenChange?.(true)}
      onMouseLeave={() => onOpenChange?.(false)}
    >
      {children}
    </div>
  ),
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

import { PersonaVisibilityInfo } from "./persona-visibility-info";
import type { PersonaModel } from "../persona-services/models";

const basePersona: PersonaModel = {
  id: "p1",
  name: "Agent",
  description: "desc",
  personaMessage: "msg",
  createdAt: new Date(),
  isPublished: false,
  type: "PERSONA",
  userId: "u1",
  extensionIds: [],
};

describe("persona-page.unit.components.007 — PersonaVisibilityInfo", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Does not render ───────────────────────────────────────────────────────

  it("renders nothing for a private persona without an access group", () => {
    const { container } = render(
      <PersonaVisibilityInfo persona={{ ...basePersona, isPublished: false }} />
    );
    expect(container.firstChild).toBeNull();
  });

  // ── Public persona ────────────────────────────────────────────────────────

  it("renders for a published persona", () => {
    render(
      <PersonaVisibilityInfo persona={{ ...basePersona, isPublished: true }} />
    );
    expect(
      screen.getByRole("button", { name: /why you can see this agent/i })
    ).toBeInTheDocument();
  });

  it("shows public tooltip message when persona is published and no access group", () => {
    render(
      <PersonaVisibilityInfo persona={{ ...basePersona, isPublished: true }} />
    );
    expect(
      screen.getByText(/everyone in your organization/i)
    ).toBeInTheDocument();
  });

  // ── Access-group persona ───────────────────────────────────────────────────

  it("renders for a persona with an access group", () => {
    const persona = {
      ...basePersona,
      isPublished: false,
      accessGroup: { id: "g1", source: "SHAREPOINT" as const },
    };
    render(<PersonaVisibilityInfo persona={persona} />);
    expect(
      screen.getByRole("button", { name: /why you can see this agent/i })
    ).toBeInTheDocument();
  });

  it("shows default access-group tooltip message before fetching group name", () => {
    const persona = {
      ...basePersona,
      isPublished: false,
      accessGroup: { id: "g1", source: "SHAREPOINT" as const },
    };
    render(<PersonaVisibilityInfo persona={persona} />);
    expect(
      screen.getByText(/shared with one of your access groups/i)
    ).toBeInTheDocument();
  });

  it("fetches group name on hover and shows it in the tooltip", async () => {
    mockAccessGroupById.mockResolvedValue({
      status: "OK",
      response: { id: "g1", name: "Finance Team", description: "" },
    });

    const persona = {
      ...basePersona,
      isPublished: false,
      accessGroup: { id: "g1", source: "SHAREPOINT" as const },
    };
    render(<PersonaVisibilityInfo persona={persona} />);

    // Simulate the Tooltip opening
    const tooltipRoot = screen.getByTestId("tooltip-root");
    await userEvent.hover(tooltipRoot);

    await waitFor(() => {
      expect(mockAccessGroupById).toHaveBeenCalledWith("g1");
    });

    await waitFor(() => {
      expect(screen.getByText(/Finance Team/)).toBeInTheDocument();
    });
  });

  it("shows error message when fetching group name fails", async () => {
    mockAccessGroupById.mockResolvedValue({
      status: "ERROR",
      errors: [{ message: "Not found" }],
    });

    const persona = {
      ...basePersona,
      isPublished: false,
      accessGroup: { id: "g2", source: "SHAREPOINT" as const },
    };
    render(<PersonaVisibilityInfo persona={persona} />);
    const tooltipRoot = screen.getByTestId("tooltip-root");
    await userEvent.hover(tooltipRoot);

    await waitFor(() => {
      expect(
        screen.getByText(/Unable to load the group name/i)
      ).toBeInTheDocument();
    });
  });

  it("does not refetch group name on subsequent hover when already loaded", async () => {
    mockAccessGroupById.mockResolvedValue({
      status: "OK",
      response: { id: "g1", name: "Engineering", description: "" },
    });

    const persona = {
      ...basePersona,
      isPublished: false,
      accessGroup: { id: "g1", source: "SHAREPOINT" as const },
    };
    render(<PersonaVisibilityInfo persona={persona} />);
    const tooltipRoot = screen.getByTestId("tooltip-root");

    await userEvent.hover(tooltipRoot);
    await waitFor(() => screen.getByText(/Engineering/));

    await userEvent.unhover(tooltipRoot);
    await userEvent.hover(tooltipRoot);

    // Called only once despite two hovers
    expect(mockAccessGroupById).toHaveBeenCalledTimes(1);
  });
});
