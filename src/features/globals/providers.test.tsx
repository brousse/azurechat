import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: any) => <div data-testid="session-provider">{children}</div>,
}));

import { AuthenticatedProviders } from "./providers";

describe("AuthenticatedProviders", () => {
  it("globals.unit.providers.001: wraps children in a NextAuth SessionProvider", () => {
    render(
      <AuthenticatedProviders>
        <span>inside</span>
      </AuthenticatedProviders>,
    );
    const host = screen.getByTestId("session-provider");
    expect(host).toHaveTextContent("inside");
  });
});
