"use server";
import "server-only";

import { GetDailyUsage, GetWeeklyUsage } from "./usage-service";
import { getBudgetConfig } from "./downgrade-config";
import { logError } from "./logger";

export interface BudgetDecision {
  exceeded: boolean;
  /** Which window tripped (daily reported first when both are over). */
  window?: "daily" | "weekly";
  currentUsd?: number;
  limitUsd?: number;
}

/**
 * Per-user cost budget check across ALL models. Evaluates a daily and a
 * rolling-7-day window against the configured thresholds. Reuses the existing
 * usage docs (GetDailyUsage / GetWeeklyUsage). Fail-safe: any error or
 * disabled config returns { exceeded: false } so a chat is never blocked.
 */
export async function CheckUserBudget(userId: string): Promise<BudgetDecision> {
  const { dailyUsd, weeklyUsd } = getBudgetConfig();
  if (dailyUsd <= 0 && weeklyUsd <= 0) {
    return { exceeded: false };
  }

  try {
    if (dailyUsd > 0) {
      const daily = await GetDailyUsage(userId);
      const spent = daily.totalCostUsd || 0;
      if (spent >= dailyUsd) {
        return { exceeded: true, window: "daily", currentUsd: spent, limitUsd: dailyUsd };
      }
    }

    if (weeklyUsd > 0) {
      const week = await GetWeeklyUsage(userId);
      const spent = week.reduce((sum, d) => sum + (d.totalCostUsd || 0), 0);
      if (spent >= weeklyUsd) {
        return { exceeded: true, window: "weekly", currentUsd: spent, limitUsd: weeklyUsd };
      }
    }

    return { exceeded: false };
  } catch (error) {
    logError("CheckUserBudget failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { exceeded: false };
  }
}
