import { test, expect } from "@playwright/test";

test.describe("extension-create", () => {
  test("/extensions hero exposes the New Extension button that opens a creation sheet", async ({ page }) => {
    await page.goto("/extensions");

    const newExtensionButton = page.getByRole("button", { name: /new extension/i }).first();
    await expect(newExtensionButton).toBeVisible({ timeout: 30_000 });
    await newExtensionButton.click();

    // The form Labels in add-new-extension.tsx aren't associated to their
    // Inputs via htmlFor, so getByLabel can't link them. Assert on the
    // placeholders / form fields instead, which are stable and unique.
    await expect(page.getByPlaceholder(/Name of your Extension/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/^Short description$/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Describe specialties.*extension/i)).toBeVisible();
  });
});
