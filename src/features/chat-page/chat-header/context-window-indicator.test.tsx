import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextWindowIndicator } from "./context-window-indicator";

// The component reads from the chat store via useChat
vi.mock("../chat-store", () => ({
  useChat: vi.fn(),
}));

vi.mock("@/ui/dropdown-menu", async () => {
  const actual = await vi.importActual<any>("@/ui/dropdown-menu");
  return actual;
});

import { useChat } from "../chat-store";

const makeUsage = (overrides = {}) => ({
  contextWindowSize: 100000,
  inputTokens: 25000,
  contextUsagePercent: 25,
  ...overrides,
});

describe("chat-page.unit.components.002 — ContextWindowIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when no usage data", () => {
    (useChat as any).mockReturnValue({ lastUsageData: null });
    const { container } = render(<ContextWindowIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when contextWindowSize is 0", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ contextWindowSize: 0 }),
    });
    const { container } = render(<ContextWindowIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when inputTokens is 0 (historical load)", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ inputTokens: 0, contextUsagePercent: 0 }),
    });
    const { container } = render(<ContextWindowIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("displays usage percentage formatted to 0 decimal in aria-label", () => {
    // 500000 / 1050000 ≈ 47.6%
    const percent = (500000 / 1050000) * 100; // ~47.619...
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ contextWindowSize: 1050000, inputTokens: 500000, contextUsagePercent: percent }),
    });
    render(<ContextWindowIndicator />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    // aria-label uses toFixed(0)
    const rounded = Math.min(percent, 100).toFixed(0);
    expect(button.getAttribute("aria-label")).toContain(rounded);
  });

  it("shows the percentage label in the trigger button", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ contextUsagePercent: 25 }),
    });
    render(<ContextWindowIndicator />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toContain("25");
  });

  // --- Three color-threshold branches ---
  it("applies text-red-500 class when percent > 80", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ contextUsagePercent: 85 }),
    });
    render(<ContextWindowIndicator />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("text-red-500");
  });

  it("applies text-yellow-500 class when percent > 50 and <= 80", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ contextUsagePercent: 65 }),
    });
    render(<ContextWindowIndicator />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("text-yellow-500");
  });

  it("applies text-muted-foreground class when percent <= 50", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ contextUsagePercent: 30 }),
    });
    render(<ContextWindowIndicator />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("text-muted-foreground");
  });

  // --- toFixed(1) in dropdown body ---
  it("shows percent.toFixed(1) in dropdown content after opening", async () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ contextUsagePercent: 47.619 }),
    });
    render(<ContextWindowIndicator />);
    await userEvent.click(screen.getByRole("button"));
    // The dropdown label contains "47.6% used"
    expect(screen.getByText(/47\.6% used/)).toBeInTheDocument();
  });

  it("dropdown body formats token counts with k/M suffixes", async () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ inputTokens: 15000, contextWindowSize: 128000, contextUsagePercent: 11.7 }),
    });
    render(<ContextWindowIndicator />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/15\.0k \/ 128\.0k tokens/)).toBeInTheDocument();
  });
});
