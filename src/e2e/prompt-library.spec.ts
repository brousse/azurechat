import { test, expect } from "@playwright/test";

test.describe("prompt-library", () => {
  test("/prompt renders the Add New Prompt hero trigger that opens the prompt sheet", async ({ page }) => {
    await page.goto("/prompt");

    const addPromptButton = page.getByRole("button", { name: /add new prompt/i }).first();
    await expect(addPromptButton).toBeVisible({ timeout: 30_000 });
    await addPromptButton.click();

    // Labels in add-new-prompt.tsx aren't htmlFor-associated to Inputs.
    await expect(page.getByPlaceholder(/Name of the prompt/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/Write a funny joke/i)).toBeVisible();
  });
});
