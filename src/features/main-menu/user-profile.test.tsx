import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockUseSession } = vi.hoisted(() => ({
  mockUseSession: vi.fn().mockReturnValue({
    data: {
      user: {
        name: "Test User",
        email: "test@example.com",
        image: "",
        isAdmin: false,
        accessToken: "test-access-token",
      },
    },
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: mockUseSession,
  signOut: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn().mockReturnValue({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/features/common/hooks/useProfilePicture", () => ({
  useProfilePicture: vi.fn().mockReturnValue(null),
}));

vi.mock("@/ui/menu", () => ({
  menuIconProps: { size: 20 },
}));

import { UserProfile } from "./user-profile";

describe("main-menu.unit.components.003 — UserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Test User",
          email: "test@example.com",
          image: "",
          isAdmin: false,
          accessToken: "test-access-token",
        },
      },
    });
  });

  it("renders the profile trigger element in the DOM", () => {
    const { container } = render(<UserProfile />);
    // The DropdownMenuTrigger renders an Avatar; confirm it's present
    expect(container.firstChild).toBeTruthy();
  });

  it("renders user name and email visible in the DOM after dropdown opens", async () => {
    const { baseElement } = render(<UserProfile />);
    // Find the dropdown trigger - it may be a span/div with data-state
    const trigger = baseElement.querySelector("[data-state]");
    if (trigger) {
      await userEvent.click(trigger as Element);
    }
    // After opening, the session data should be rendered
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows avatar fallback (User SVG icon) when image is empty and no profile picture", () => {
    const { container } = render(<UserProfile />);
    // The Avatar fallback renders a User icon SVG
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("does not show Admin label for non-admin user", async () => {
    const { baseElement } = render(<UserProfile />);
    const trigger = baseElement.querySelector("[data-state]");
    if (trigger) {
      await userEvent.click(trigger as Element);
    }
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows Admin label for admin user", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Admin User",
          email: "admin@test.local",
          image: "",
          isAdmin: true,
          accessToken: "admin-token",
        },
      },
    });
    const { baseElement } = render(<UserProfile />);
    const trigger = baseElement.querySelector("[data-state]");
    if (trigger) {
      await userEvent.click(trigger as Element);
    }
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});
