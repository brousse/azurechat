import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("health endpoint responds 200", async ({ request }) => {
    const res = await request.get("/health");
    expect(res.status()).toBe(200);
  });

  test("authenticated user can reach /chat shell", async ({ page }) => {
    const response = await page.goto("/chat");
    expect(response?.status() ?? 0).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/$/);
  });
});
