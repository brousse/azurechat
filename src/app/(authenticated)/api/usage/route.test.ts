import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/common/services/usage-service", () => ({
  GetDailyUsage: vi.fn(),
  GetWeeklyUsage: vi.fn(),
}));

vi.mock("@/features/common/services/logger", () => ({
  logError: vi.fn(),
}));

import { GetDailyUsage, GetWeeklyUsage } from "@/features/common/services/usage-service";
import { GET } from "./route";

const mockedGetDailyUsage = GetDailyUsage as ReturnType<typeof vi.fn>;
const mockedGetWeeklyUsage = GetWeeklyUsage as ReturnType<typeof vi.fn>;

const dailyFixture = {
  totalInputTokens: 1000,
  totalOutputTokens: 500,
  totalCostUsd: 0.05,
  models: { "gpt-a": { inputTokens: 1000, outputTokens: 500, costUsd: 0.05, calls: 3 } },
};

const weeklyFixture = [
  { totalInputTokens: 2000, totalOutputTokens: 1000, totalCostUsd: 0.10, models: {}, date: "2026-05-14", userId: "u1", id: "1", type: "usage" },
  { totalInputTokens: 3000, totalOutputTokens: 1500, totalCostUsd: 0.15, models: {}, date: "2026-05-13", userId: "u1", id: "2", type: "usage" },
];

describe("/api/usage route", () => {
  beforeEach(() => {
    mockedGetDailyUsage.mockReset();
    mockedGetWeeklyUsage.mockReset();
  });

  // api.unit.usage.001 — happy path daily + weekly aggregation
  it("returns aggregated daily and weekly usage", async () => {
    mockedGetDailyUsage.mockResolvedValue(dailyFixture);
    mockedGetWeeklyUsage.mockResolvedValue(weeklyFixture);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.daily).toEqual({
      totalTokens: 1500,           // 1000 + 500
      totalCostUsd: 0.05,
      models: dailyFixture.models,
    });

    expect(body.weekly).toEqual({
      totalTokens: 7500,            // (2000+1000) + (3000+1500)
      totalCostUsd: 0.25,           // 0.10 + 0.15
    });
  });

  // api.unit.usage.002 — empty weekly array → zeros
  it("returns zero weekly totals when weekly array is empty", async () => {
    mockedGetDailyUsage.mockResolvedValue(dailyFixture);
    mockedGetWeeklyUsage.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.weekly.totalTokens).toBe(0);
    expect(body.weekly.totalCostUsd).toBe(0);
  });

  // api.unit.usage.003 — Cosmos/service throw → 500
  it("returns 500 when GetDailyUsage throws", async () => {
    mockedGetDailyUsage.mockRejectedValue(new Error("Cosmos connection failed"));
    mockedGetWeeklyUsage.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to get usage/);
  });

  // api.unit.usage.004 — GetWeeklyUsage throws → 500
  it("returns 500 when GetWeeklyUsage throws", async () => {
    mockedGetDailyUsage.mockResolvedValue(dailyFixture);
    mockedGetWeeklyUsage.mockRejectedValue(new Error("weekly query failed"));

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to get usage/);
  });

  // api.unit.usage.005 — non-Error throw → covers String(error) branch in catch
  it("returns 500 when a non-Error string is thrown", async () => {
    mockedGetDailyUsage.mockRejectedValue("raw string error");
    mockedGetWeeklyUsage.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to get usage/);
  });
});
