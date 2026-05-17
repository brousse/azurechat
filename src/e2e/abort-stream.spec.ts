import { test, expect } from "@playwright/test";

test.describe("abort-stream", () => {
  test("/chat/temporary streaming response can be stopped via the stop button", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
        body: [
          'data: {"choices":[{"delta":{"content":"Token one "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"token two "}}]}\n\n',
        ].join(""),
      });
    });

    await page.goto("/chat/temporary");

    const textarea = page.getByPlaceholder("Type your message...");
    await expect(textarea).toBeVisible({ timeout: 30_000 });

    await textarea.fill("Stream something");
    await page.keyboard.press("Enter");

    // While the stream is in-flight, the input switches to a stop button.
    const stopButton = page.getByRole("button", { name: /stop/i }).first();
    await expect(stopButton).toBeVisible({ timeout: 15_000 });
    await stopButton.click();

    // After abort, the send affordance comes back. We assert by waiting for the
    // stop button to leave the DOM rather than relying on a fragile content diff.
    await expect(stopButton).toBeHidden({ timeout: 10_000 });
  });
});
