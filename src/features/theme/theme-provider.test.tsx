import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "./theme-provider";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children, ...props }: any) => (
    <div data-testid="next-themes" data-attr={JSON.stringify(props)}>
      {children}
    </div>
  ),
}));

describe("ThemeProvider", () => {
  it("theme.unit.provider.001: renders children inside next-themes once mounted", async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <span>child</span>
      </ThemeProvider>,
    );
    const host = await screen.findByTestId("next-themes");
    expect(host).toHaveTextContent("child");
    const props = JSON.parse(host.getAttribute("data-attr") ?? "{}");
    expect(props).toMatchObject({ attribute: "class", defaultTheme: "dark" });
  });
});
