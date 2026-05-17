import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockSetTheme } = vi.hoisted(() => ({
  mockSetTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn().mockReturnValue({ theme: "light", setTheme: mockSetTheme }),
}));

import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "next-themes";

describe("main-menu.unit.components.002 — ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTheme as any).mockReturnValue({ theme: "light", setTheme: mockSetTheme });
  });

  it("renders light, dark, system buttons", () => {
    render(<ThemeToggle />);
    expect(screen.getByTitle("Light theme")).toBeInTheDocument();
    expect(screen.getByTitle("Dark theme")).toBeInTheDocument();
    expect(screen.getByTitle("System theme")).toBeInTheDocument();
  });

  it("calls setTheme('dark') when dark button is clicked", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByTitle("Dark theme"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme('light') when light button is clicked", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByTitle("Light theme"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("calls setTheme('system') when system button is clicked", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByTitle("System theme"));
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });
});
