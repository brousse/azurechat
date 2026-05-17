import path from "node:path";
import { test, expect } from "@playwright/test";

test.describe("reporting - regular user is denied", () => {
  // Uses default user storage state (non-admin)
  test("regular user navigating to /reporting is redirected or denied", async ({ page }) => {
    const response = await page.goto("/reporting");

    // Either the server responds with 403/404, or it redirects to /unauthorized
    // or the page shows an access-denied message
    const url = page.url();
    const status = response?.status() ?? 0;

    const isRedirectedToUnauthorized = url.includes("/unauthorized");
    const isDeniedStatus = status === 403 || status === 404;

    // If the page loaded (200), it must not contain the reporting table
    if (status === 200 && !isRedirectedToUnauthorized) {
      // The report table header "Conversation" should not be visible
      await expect(page.getByRole("columnheader", { name: "Conversation" })).not.toBeVisible({ timeout: 5000 });
    } else {
      expect(isRedirectedToUnauthorized || isDeniedStatus).toBe(true);
    }
  });
});

test.describe("reporting - admin can view report table", () => {
  test.use({ storageState: path.resolve(__dirname, ".auth/admin.json") });

  

  test("admin user can view the report table", async ({ page }) => {
    await page.goto("/reporting");

    // Should not be redirected to unauthorized
    expect(page.url()).not.toContain("/unauthorized");

    // The reporting table headers should be visible
    await expect(page.getByRole("columnheader", { name: "Conversation" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("columnheader", { name: "User" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible();
  });
});
