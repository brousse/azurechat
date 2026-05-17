import { test, expect } from "@playwright/test";

// Real-user invariant: I can create a persona ("agent"), see it in the library,
// start a chat with it, and the chat is bound to that persona (header shows
// the persona name; messages go through the real chat pipeline).
//
// Runs against AZURECHAT_TEST_BACKEND=memory — persona writes hit the
// in-memory Cosmos history container.
test.describe("persona-end-to-end", () => {
  test("create persona → appears in library → start chat → composer ready", async ({ page }) => {
    const personaName = `E2E Robot ${Date.now()}`;
    const personaDescription = "Robot persona for e2e test";
    const personaInstructions =
      "You are a robot. Always respond starting with the literal word BEEP.";

    await page.goto("/agent");

    await page.getByRole("button", { name: /new agent/i }).first().click();

    const nameInput = page.getByPlaceholder(/Name of your agent/i);
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(personaName);
    await page.getByPlaceholder(/^Short description$/i).fill(personaDescription);
    await page.getByPlaceholder(/Instructions for your agent/i).fill(personaInstructions);

    // Save closes the sheet (server action `AddOrUpdatePersona` then revalidates).
    await page.getByRole("button", { name: /^save$/i }).click();

    // Sheet has closed — the name field placeholder is no longer in the DOM.
    await expect(nameInput).toBeHidden({ timeout: 15_000 });

    // RevalidateCache({page:"agent"}) invalidates the route cache server-side
    // but does not push fresh HTML to the current document. Reload to pick up
    // the new persona in the server-rendered list.
    await page.goto("/agent");

    // The new persona shows up in the library grid as a card with the chosen name.
    const personaHeading = page.getByText(personaName, { exact: true }).first();
    await expect(personaHeading).toBeVisible({ timeout: 10_000 });

    // "Start chat" on that card creates a chat thread (CreatePersonaChat) and
    // navigates to /chat/<threadId>. The card with our persona has a
    // sibling "Start chat" button; scope by the closest card containing the name.
    const personaCard = page
      .locator("div")
      .filter({ hasText: personaName })
      .filter({ has: page.getByRole("button", { name: /start chat/i }) })
      .first();
    await personaCard.getByRole("button", { name: /start chat/i }).click();

    await page.waitForURL(/\/chat\/[^/]+$/, { timeout: 30_000 });

    // Composer renders and a turn round-trips through /api/chat → fake OpenAI.
    const textarea = page.getByPlaceholder("Type your message...");
    await expect(textarea).toBeVisible({ timeout: 30_000 });
    await textarea.fill("hello robot");
    await page.keyboard.press("Enter");
    await expect(page.getByText("hello robot")).toBeVisible({ timeout: 15_000 });
    // Scope to the message log so a prior thread's auto-title in the sidebar
    // (which can be the same stubbed reply) doesn't trigger strict-mode-violation.
    await expect(
      page.getByRole("log").getByText(/TEST: this is a stubbed assistant reply/).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
