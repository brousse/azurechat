import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/features/common/services/changelog", () => ({
  getChangelog: vi.fn(),
}));

vi.mock("@/features/common/services/logger", () => ({
  logError: vi.fn(),
}));

vi.mock("@/app/(authenticated)/chat/loading", () => ({
  default: () => <div data-testid="loading" />,
}));

import { Changelog } from "./changelog";
import { getChangelog } from "@/features/common/services/changelog";

describe("chat-home-page.unit.004 — Changelog", () => {
  it("shows loading while fetching", () => {
    (getChangelog as any).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    render(<Changelog />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("shows error message when fetch fails", async () => {
    (getChangelog as any).mockRejectedValue(new Error("network"));
    render(<Changelog />);
    await waitFor(() => {
      expect(
        screen.getByText(/failed to load changelog/i)
      ).toBeInTheDocument();
    });
  });

  it("renders empty div (no cards) when changelog has no entries", async () => {
    (getChangelog as any).mockResolvedValue(""); // empty content
    render(<Changelog />);
    await waitFor(() => {
      // No card headings should be visible
      expect(screen.queryByRole("heading")).toBeNull();
    });
  });

  it("renders version entries when changelog has content", async () => {
    const content = `[v1.0.0] – 2026-01-01
Added: New feature`;
    (getChangelog as any).mockResolvedValue(content);
    render(<Changelog />);
    await waitFor(() => {
      expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    });
  });
});
