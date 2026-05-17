import { test, expect } from "@playwright/test";

test.describe("persona-switch", () => {
  test("/agent renders the agent library with the search input", async ({ page }) => {
    await page.goto("/agent");

    // The agent list always renders a search input and the All Agents / Agents heading.
    await expect(page.getByPlaceholder(/search agents/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /^Agents$|^All Agents$/ }).first()).toBeVisible();
  });
});
