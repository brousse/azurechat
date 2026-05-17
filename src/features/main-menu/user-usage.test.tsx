import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

describe("main-menu.unit.components.004 — UserUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when fetch returns zero tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            daily: { totalTokens: 0, totalCostUsd: 0, models: {} },
            weekly: { totalTokens: 0, totalCostUsd: 0 },
          }),
          { status: 200 }
        )
      )
    );

    const { UserUsage } = await import("./user-usage");
    const { container } = render(<UserUsage />);

    await waitFor(() => {
      // Component returns null when no usage
      expect(container.firstChild).toBeNull();
    });
  });

  it("displays formatted token count when usage available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            daily: { totalTokens: 12345, totalCostUsd: 0.05, models: {} },
            weekly: { totalTokens: 0, totalCostUsd: 0 },
          }),
          { status: 200 }
        )
      )
    );

    const { UserUsage } = await import("./user-usage");
    render(<UserUsage />);

    await waitFor(() => {
      // 12345 formatted as "12.3k"
      expect(screen.getByText("12.3k")).toBeInTheDocument();
    });
  });

  it("renders nothing when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network"))
    );

    const { UserUsage } = await import("./user-usage");
    const { container } = render(<UserUsage />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
