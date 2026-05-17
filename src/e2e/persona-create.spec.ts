import { test, expect } from "@playwright/test";

test.describe("persona-create", () => {
  test("/agent hero exposes the New Agent button that opens a creation sheet", async ({ page }) => {
    await page.goto("/agent");

    const newAgentTrigger = page.getByRole("button", { name: /new agent/i }).first();
    await expect(newAgentTrigger).toBeVisible({ timeout: 30_000 });
    await newAgentTrigger.click();

    // Form Labels in add-new-persona.tsx aren't htmlFor-associated to Inputs,
    // so assert on placeholders (stable, unique).
    await expect(page.getByPlaceholder(/Name of your agent/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/^Short description$/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Instructions for your agent/i)).toBeVisible();
  });
});
