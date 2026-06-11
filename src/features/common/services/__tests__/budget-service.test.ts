import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/common/services/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

const mockGetDailyUsage = vi.fn();
const mockGetWeeklyUsage = vi.fn();
vi.mock("../usage-service", () => ({
  GetDailyUsage: (...a: unknown[]) => mockGetDailyUsage(...a),
  GetWeeklyUsage: (...a: unknown[]) => mockGetWeeklyUsage(...a),
}));

const mockGetBudgetConfig = vi.fn();
vi.mock("../downgrade-config", () => ({
  getBudgetConfig: () => mockGetBudgetConfig(),
}));

import { CheckUserBudget } from "../budget-service";

const daily = (usd: number) => ({ totalCostUsd: usd });
const weekDocs = (...usd: number[]) => usd.map((u) => ({ totalCostUsd: u }));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBudgetConfig.mockReturnValue({ dailyUsd: 3, weeklyUsd: 7 });
  mockGetDailyUsage.mockResolvedValue(daily(0));
  mockGetWeeklyUsage.mockResolvedValue(weekDocs(0));
});

describe("CheckUserBudget", () => {
  it("returns not-exceeded when both windows are disabled (0)", async () => {
    mockGetBudgetConfig.mockReturnValue({ dailyUsd: 0, weeklyUsd: 0 });
    const r = await CheckUserBudget("u1");
    expect(r.exceeded).toBe(false);
    expect(mockGetDailyUsage).not.toHaveBeenCalled();
    expect(mockGetWeeklyUsage).not.toHaveBeenCalled();
  });

  it("flags daily when daily spend >= daily cap", async () => {
    mockGetDailyUsage.mockResolvedValue(daily(3.5));
    const r = await CheckUserBudget("u1");
    expect(r).toMatchObject({ exceeded: true, window: "daily", currentUsd: 3.5, limitUsd: 3 });
  });

  it("flags weekly when only the weekly window is over", async () => {
    mockGetDailyUsage.mockResolvedValue(daily(1)); // under daily
    mockGetWeeklyUsage.mockResolvedValue(weekDocs(2, 3, 2.5)); // 7.5 >= 7
    const r = await CheckUserBudget("u1");
    expect(r).toMatchObject({ exceeded: true, window: "weekly", limitUsd: 7 });
    expect(r.currentUsd).toBeCloseTo(7.5);
  });

  it("reports daily first when BOTH windows are over", async () => {
    mockGetDailyUsage.mockResolvedValue(daily(5));
    mockGetWeeklyUsage.mockResolvedValue(weekDocs(20));
    const r = await CheckUserBudget("u1");
    expect(r.window).toBe("daily");
  });

  it("returns not-exceeded when under both caps", async () => {
    mockGetDailyUsage.mockResolvedValue(daily(1));
    mockGetWeeklyUsage.mockResolvedValue(weekDocs(1, 1, 1));
    const r = await CheckUserBudget("u1");
    expect(r.exceeded).toBe(false);
  });

  it("only checks the enabled window (daily disabled → weekly only)", async () => {
    mockGetBudgetConfig.mockReturnValue({ dailyUsd: 0, weeklyUsd: 7 });
    mockGetWeeklyUsage.mockResolvedValue(weekDocs(8));
    const r = await CheckUserBudget("u1");
    expect(mockGetDailyUsage).not.toHaveBeenCalled();
    expect(r).toMatchObject({ exceeded: true, window: "weekly" });
  });

  it("fails safe to not-exceeded when usage lookup throws", async () => {
    mockGetDailyUsage.mockRejectedValue(new Error("cosmos down"));
    const r = await CheckUserBudget("u1");
    expect(r.exceeded).toBe(false);
  });
});
