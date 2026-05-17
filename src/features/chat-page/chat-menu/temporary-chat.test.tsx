import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockPush, mockUsePathname } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockUsePathname = vi.fn(() => "/chat/some-thread");
  return { mockPush, mockUsePathname };
});

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({ push: mockPush }),
    usePathname: mockUsePathname,
  };
});

vi.mock("@/features/theme/theme-config", () => ({
  TEMPORARY_CHAT_ROUTE: "/chat/temporary",
}));

import { TemporaryChat } from "./temporary-chat";

describe("chat-page.unit.components — TemporaryChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/chat/some-thread");
  });

  it("renders the Temporary Chat button", () => {
    render(<TemporaryChat />);
    expect(screen.getByTitle("Temporary Chat")).toBeInTheDocument();
  });

  it("clicking the button navigates to TEMPORARY_CHAT_ROUTE", async () => {
    render(<TemporaryChat />);
    await userEvent.click(screen.getByTitle("Temporary Chat"));
    expect(mockPush).toHaveBeenCalledWith("/chat/temporary");
  });

  it("applies text-primary class when already on temporary-chat route", () => {
    mockUsePathname.mockReturnValue("/chat/temporary");
    render(<TemporaryChat />);
    const btn = screen.getByTitle("Temporary Chat");
    expect(btn.className).toContain("text-primary");
  });

  it("does not apply text-primary when on a different route", () => {
    mockUsePathname.mockReturnValue("/chat/other");
    render(<TemporaryChat />);
    const btn = screen.getByTitle("Temporary Chat");
    expect(btn.className).not.toContain("text-primary");
  });
});
