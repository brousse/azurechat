import { NextResponse } from "next/server";
import { GetDailyUsage, GetWeeklyUsage } from "@/features/common/services/usage-service";
import { getBudgetConfig } from "@/features/common/services/downgrade-config";
import { logError } from "@/features/common/services/logger";

export async function GET() {
  try {
    const [daily, weekly] = await Promise.all([
      GetDailyUsage(),
      GetWeeklyUsage(),
    ]);

    // Configured per-user budget caps (0 = disabled). Surfaced so the usage
    // overview can show how close the user is to a downgrade.
    const budget = getBudgetConfig();

    const weeklyTotals = weekly.reduce(
      (acc, day) => ({
        totalInputTokens: acc.totalInputTokens + day.totalInputTokens,
        totalOutputTokens: acc.totalOutputTokens + day.totalOutputTokens,
        totalCostUsd: acc.totalCostUsd + day.totalCostUsd,
      }),
      { totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0 }
    );

    return NextResponse.json({
      daily: {
        totalTokens: daily.totalInputTokens + daily.totalOutputTokens,
        totalCostUsd: daily.totalCostUsd,
        models: daily.models,
      },
      weekly: {
        totalTokens: weeklyTotals.totalInputTokens + weeklyTotals.totalOutputTokens,
        totalCostUsd: weeklyTotals.totalCostUsd,
      },
      limits: {
        dailyUsd: budget.dailyUsd,
        weeklyUsd: budget.weeklyUsd,
      },
    });
  } catch (error) {
    logError("Error getting usage", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to get usage" },
      { status: 500 }
    );
  }
}
