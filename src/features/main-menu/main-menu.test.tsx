import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainMenu } from "./main-menu";
import type { UserModel } from "../auth-page/helpers";

vi.mock("./menu-tray-toggle", () => ({
  MenuTrayToggle: () => <div data-testid="menu-tray-toggle" />,
}));

vi.mock("./menu-link", () => ({
  MenuLink: ({ children, href, ariaLabel }: any) => (
    <a href={href} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

vi.mock("./user-profile", () => ({
  UserProfile: () => <div data-testid="user-profile" />,
}));

vi.mock("./user-usage", () => ({
  UserUsage: () => <div data-testid="user-usage" />,
}));

vi.mock("./menu-store", () => ({
  useMenuState: vi.fn().mockReturnValue({ isMainMenuOpen: true }),
  menuStore: { toggle: vi.fn() },
}));

vi.mock("@/ui/menu", () => ({
  Menu: ({ children }: any) => <nav>{children}</nav>,
  MenuBar: ({ children }: any) => <div>{children}</div>,
  MenuItem: ({ children, tooltip }: any) => (
    <div title={tooltip}>{children}</div>
  ),
  MenuItemContainer: ({ children }: any) => <div>{children}</div>,
  menuIconProps: { size: 20 },
}));

const nonAdminUser: UserModel = {
  name: "Test User",
  email: "test@example.com",
  image: "",
  isAdmin: false,
  token: "test-token",
  isLocalDevUser: false,
};

const adminUser: UserModel = {
  ...nonAdminUser,
  isAdmin: true,
};

describe("main-menu.unit.components.001 — MainMenu admin links", () => {
  it("shows /reporting link only for admin users", () => {
    const { unmount } = render(<MainMenu user={adminUser} />);
    expect(screen.getByRole("link", { name: /admin reporting/i })).toBeInTheDocument();
    unmount();
  });

  it("does NOT show /reporting link for non-admin", () => {
    render(<MainMenu user={nonAdminUser} />);
    expect(
      screen.queryByRole("link", { name: /admin reporting/i })
    ).not.toBeInTheDocument();
  });

  it("always shows chat, agent, extensions, prompt links", () => {
    render(<MainMenu user={nonAdminUser} />);
    expect(screen.getByRole("link", { name: /chat page/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /agent configuration/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /extensions configuration/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /prompt library/i })
    ).toBeInTheDocument();
  });
});
