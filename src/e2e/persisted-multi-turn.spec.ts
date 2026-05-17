import { test, expect } from "@playwright/test";

// Real-user invariant: send a few messages in a fresh thread, navigate away and
// back, and the transcript is still there. Exercises the full New Chat form
// action → /chat/[id] redirect → /api/chat → in-memory Cosmos persistence path,
// with the AZURECHAT_TEST_BACKEND=memory fake OpenAI replying TEST_REPLY.
//
// Memory backend persists within the single Node process, so reloading the
// page (same server) is the right "leaves and comes back" simulation.
test.describe("persisted-multi-turn", () => {
  test("messages survive a hard reload of /chat/[id]", async ({ page }) => {
    await page.goto("/chat");

    // The New Chat button lives inside `<form action={CreateChatAndRedirect}>`
    // (chat-menu-header.tsx). Submitting redirects to /chat/<new-id>.
    await page.getByRole("button", { name: /new chat/i }).first().click();
    await page.waitForURL(/\/chat\/[^/]+$/, { timeout: 30_000 });
    const threadUrl = page.url();

    const textarea = page.getByPlaceholder("Type your message...");
    await expect(textarea).toBeVisible({ timeout: 30_000 });

    const userMessages = ["first question", "second question", "third question"];
    for (const msg of userMessages) {
      await textarea.fill(msg);
      await page.keyboard.press("Enter");
      // Wait for the stubbed assistant reply chunk before sending the next turn —
      // each `getByText` will resolve against the matching assistant bubble for
      // this turn. The fake OpenAI returns the same TEST_REPLY every time, so
      // we rely on the user message itself as the "this turn rendered" marker.
      await expect(page.getByText(msg)).toBeVisible({ timeout: 15_000 });
      // And wait for the loading state to clear before next turn (stop button
      // hides when streaming completes).
      await expect(page.getByRole("button", { name: /stop/i })).toBeHidden({ timeout: 15_000 });
    }

    // Three user bubbles + N assistant bubbles per turn (the markdoc tree
    // renders the assistant text in multiple DOM nodes — we don't pin the
    // exact factor, just the post-reload equality).
    for (const msg of userMessages) {
      await expect(page.getByText(msg)).toBeVisible();
    }
    // At least 3 assistant bubbles exist before reload (one per turn). The
    // markdoc tree may produce >1 DOM node per bubble, so we don't pin a
    // specific count.
    await expect
      .poll(() => page.getByText(/TEST: this is a stubbed assistant reply/).count(), {
        timeout: 10_000,
      })
      .toBeGreaterThanOrEqual(3);

    // Reload the thread directly — same Node process, in-memory Cosmos still
    // holds the messages. The transcript survives.
    await page.goto(threadUrl);
    await expect(textarea).toBeVisible({ timeout: 30_000 });

    for (const msg of userMessages) {
      await expect(page.getByText(msg)).toBeVisible({ timeout: 10_000 });
    }
    await expect
      .poll(() => page.getByText(/TEST: this is a stubbed assistant reply/).count(), {
        timeout: 10_000,
      })
      .toBeGreaterThanOrEqual(3);
  });
});
