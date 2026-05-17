import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/features/ui/tooltip";

const withTooltipProvider = (ui: React.ReactElement) => (
  <TooltipProvider>{ui}</TooltipProvider>
);
const customRender = (ui: React.ReactElement) => render(withTooltipProvider(ui));

const { mockUserAccessGroups } = vi.hoisted(() => ({
  mockUserAccessGroups: vi.fn(),
}));

vi.mock("@/features/persona-page/persona-services/access-group-service", () => ({
  UserAccessGroups: mockUserAccessGroups,
}));

vi.mock("@/features/auth-page/logout-on-session-expired", () => ({
  logoutOnSessionExpired: vi.fn().mockReturnValue(false),
}));

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));
vi.mock("@/features/ui/use-toast", () => ({ toast: mockToast }));

import { PersonaAccessGroupSelector } from "./persona-access-group-selector";

const groups = [
  { id: "g1", name: "Engineering", description: "Eng group" },
  { id: "g2", name: "Finance", description: "Finance group" },
];

describe("persona-page.unit.components.009 — PersonaAccessGroupSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserAccessGroups.mockResolvedValue({ status: "OK", response: groups });
  });

  const openDialog = async () => {
    const onSelectGroup = vi.fn();
    customRender(
      <PersonaAccessGroupSelector
        onSelectGroup={onSelectGroup}
        selectedAccessGroupId=""
      />
    );
    // Click the Edit icon button to open the dialog
    await userEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.getByText("Access to Agent")).toBeInTheDocument()
    );
    return { onSelectGroup };
  };

  it("renders the edit button", () => {
    customRender(
      <PersonaAccessGroupSelector onSelectGroup={vi.fn()} selectedAccessGroupId="" />
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("opens dialog and shows fetched groups", async () => {
    await openDialog();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
  });

  it("filters groups by search query", async () => {
    await openDialog();
    const searchInput = screen.getByPlaceholderText("Search...");
    await userEvent.type(searchInput, "Eng");
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.queryByText("Finance")).not.toBeInTheDocument();
  });

  it("calls onSelectGroup when a radio option is selected", async () => {
    const { onSelectGroup } = await openDialog();
    const radioItems = screen.getAllByRole("radio");
    await userEvent.click(radioItems[0]);
    expect(onSelectGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: "g1" })
    );
  });

  it("shows an error toast when UserAccessGroups returns an error status", async () => {
    mockUserAccessGroups.mockResolvedValue({
      status: "ERROR",
      errors: [{ message: "Server unavailable" }],
    });
    customRender(
      <PersonaAccessGroupSelector onSelectGroup={vi.fn()} selectedAccessGroupId="" />
    );
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" })
      );
    });
  });

  it("shows an error toast when UserAccessGroups throws", async () => {
    mockUserAccessGroups.mockRejectedValue(new Error("network down"));
    customRender(
      <PersonaAccessGroupSelector onSelectGroup={vi.fn()} selectedAccessGroupId="" />
    );
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" })
      );
    });
  });
});
