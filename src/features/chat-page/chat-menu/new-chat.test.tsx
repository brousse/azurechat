import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// react-dom's useFormStatus requires a form context; mock it to control pending state
vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return { ...actual, useFormStatus: vi.fn().mockReturnValue({ pending: false }) };
});

import { useFormStatus } from "react-dom";
import { NewChat } from "./new-chat";

describe("chat-page.unit.components — NewChat", () => {
  it("renders a 'New Chat' button when not pending", () => {
    (useFormStatus as any).mockReturnValue({ pending: false });
    render(<NewChat />);
    expect(screen.getByRole("button", { name: /new chat/i })).toBeInTheDocument();
  });

  it("shows a loading indicator and no Plus icon when pending", () => {
    (useFormStatus as any).mockReturnValue({ pending: true });
    render(<NewChat />);
    // Button still present with aria-disabled
    const btn = screen.getByRole("button", { name: /new chat/i });
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });

  it("is not aria-disabled when not pending", () => {
    (useFormStatus as any).mockReturnValue({ pending: false });
    render(<NewChat />);
    const btn = screen.getByRole("button", { name: /new chat/i });
    expect(btn).toHaveAttribute("aria-disabled", "false");
  });
});
