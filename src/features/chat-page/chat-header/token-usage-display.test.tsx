import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../chat-store", () => ({
  useChat: vi.fn(),
}));

import { useChat } from "../chat-store";
import { TokenUsageDisplay } from "./token-usage-display";

const makeUsage = (overrides = {}) => ({
  threadTotalTokens: 1500,
  threadTotalCostUsd: 0.02,
  inputTokens: 800,
  outputTokens: 200,
  cachedTokens: 0,
  contextWindowSize: 128000,
  contextUsagePercent: 0.625,
  costUsd: 0.005,
  ...overrides,
});

describe("chat-page.unit.components — TokenUsageDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when lastUsageData is null", () => {
    (useChat as any).mockReturnValue({ lastUsageData: null });
    const { container } = render(<TokenUsageDisplay />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a button with aria-label containing token count", () => {
    (useChat as any).mockReturnValue({ lastUsageData: makeUsage() });
    render(<TokenUsageDisplay />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("1.5k");
  });

  it("shows cost when threadTotalCostUsd > 0", () => {
    (useChat as any).mockReturnValue({ lastUsageData: makeUsage({ threadTotalCostUsd: 0.03 }) });
    render(<TokenUsageDisplay />);
    expect(screen.getByRole("button").textContent).toContain("$0.03");
  });

  it("hides cost section when threadTotalCostUsd is 0", () => {
    (useChat as any).mockReturnValue({ lastUsageData: makeUsage({ threadTotalCostUsd: 0 }) });
    render(<TokenUsageDisplay />);
    expect(screen.getByRole("button").textContent).not.toContain("$");
  });

  it("uses M suffix for tokens >= 1,000,000", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ threadTotalTokens: 2_500_000 }),
    });
    render(<TokenUsageDisplay />);
    expect(screen.getByRole("button").textContent).toContain("2.5M");
  });

  it("displays raw number for tokens < 1000", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ threadTotalTokens: 42 }),
    });
    render(<TokenUsageDisplay />);
    expect(screen.getByRole("button").textContent).toContain("42");
  });

  it("applies red ring color class when context usage > 80%", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({
        contextWindowSize: 100,
        inputTokens: 90,
        contextUsagePercent: 90,
      }),
    });
    render(<TokenUsageDisplay />);
    // The svg element should carry the red class
    const svgParent = screen.getByRole("button");
    expect(svgParent.innerHTML).toContain("text-red-500");
  });

  it("applies yellow ring color class when context usage > 50% and <= 80%", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({
        contextWindowSize: 100,
        inputTokens: 60,
        contextUsagePercent: 60,
      }),
    });
    render(<TokenUsageDisplay />);
    expect(screen.getByRole("button").innerHTML).toContain("text-yellow-500");
  });

  it("applies default muted ring color when context usage <= 50%", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({
        contextWindowSize: 100,
        inputTokens: 30,
        contextUsagePercent: 30,
      }),
    });
    render(<TokenUsageDisplay />);
    expect(screen.getByRole("button").innerHTML).toContain("text-primary/60");
  });

  it("formats cost < 0.01 as '< $0.01'", () => {
    (useChat as any).mockReturnValue({
      lastUsageData: makeUsage({ threadTotalCostUsd: 0.001 }),
    });
    render(<TokenUsageDisplay />);
    expect(screen.getByRole("button").textContent).toContain("< $0.01");
  });
});
