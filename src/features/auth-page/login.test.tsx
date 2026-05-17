import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockSignIn } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

vi.mock("../theme/theme-config", () => ({
  AI_NAME: "TestAI",
}));

import { LogIn } from "./login";

describe("auth-page — LogIn component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Microsoft Entra sign-in button", () => {
    render(<LogIn isDevMode={false} />);
    expect(
      screen.getByRole("button", { name: /microsoft entra/i })
    ).toBeInTheDocument();
  });

  it("calls signIn('azure-ad') when Microsoft Entra button clicked", async () => {
    render(<LogIn isDevMode={false} />);
    await userEvent.click(
      screen.getByRole("button", { name: /microsoft entra/i })
    );
    expect(mockSignIn).toHaveBeenCalledWith("azure-ad");
  });

  it("does NOT show Basic Auth button when isDevMode is false", () => {
    render(<LogIn isDevMode={false} />);
    expect(
      screen.queryByRole("button", { name: /basic auth/i })
    ).not.toBeInTheDocument();
  });

  it("shows Basic Auth button when isDevMode is true", () => {
    render(<LogIn isDevMode={true} />);
    expect(
      screen.getByRole("button", { name: /basic auth/i })
    ).toBeInTheDocument();
  });

  it("calls signIn('localdev') when Basic Auth button clicked", async () => {
    render(<LogIn isDevMode={true} />);
    await userEvent.click(
      screen.getByRole("button", { name: /basic auth/i })
    );
    expect(mockSignIn).toHaveBeenCalledWith("localdev");
  });

  it("renders the AI name in the card title", () => {
    render(<LogIn isDevMode={false} />);
    expect(screen.getByText("TestAI")).toBeInTheDocument();
  });
});
