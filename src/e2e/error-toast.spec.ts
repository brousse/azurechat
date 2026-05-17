import { test, expect } from "@playwright/test";

test.describe("error-toast", () => {
  test("/api/chat returning 500 surfaces a visible error region after sending a message", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/chat/temporary");

    const textarea = page.getByPlaceholder("Type your message...");
    await expect(textarea).toBeVisible({ timeout: 30_000 });

    await textarea.fill("trigger an error");
    await page.keyboard.press("Enter");

    // Either the Radix toast viewport (role="status"/"alert") or a destructive-styled
    // node should appear. Both selectors cover the variations used by the codebase.
    const errorRegion = page
      .locator('[data-variant="destructive"], [role="status"], [role="alert"]')
      .filter({ hasText: /./ })
      .first();
    await expect(errorRegion).toBeVisible({ timeout: 15_000 });
  });
});
