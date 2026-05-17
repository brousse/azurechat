import { test, expect } from "@playwright/test";

test.describe("empty-thread-state", () => {
  test("/chat home renders the brand hero and the articles section", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: /Bühler Chat/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Articles/i })).toBeVisible();
    // With no fixture news, ArticlesSection shows the empty-state copy.
    await expect(page.getByText(/No current news/i)).toBeVisible();
  });
});
