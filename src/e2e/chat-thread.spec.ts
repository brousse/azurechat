import { test, expect } from "@playwright/test";

// The chat client parses each SSE `data:` event as JSON and dispatches on
// `responseType.type`. See chat-store.tsx's createStreamParser — it only
// understands the app's custom envelope (`{ type: "content"|"finalContent"|
// "abort"|"error"|"reasoning", response: ... }`), NOT the raw OpenAI Chat
// Completions delta shape.
const CANNED_SSE = [
  'data: {"type":"content","response":{"id":"msg-test-1","choices":[{"message":{"content":"Hello from the "}}]}}\n\n',
  'data: {"type":"content","response":{"id":"msg-test-1","choices":[{"message":{"content":"assistant!"}}]}}\n\n',
  'data: {"type":"finalContent","response":"Hello from the assistant!"}\n\n',
].join("");

test.describe("chat-thread", () => {
  test("send a message in /chat/temporary and render the assistant reply", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "x-content-type-options": "nosniff",
        },
        body: CANNED_SSE,
      });
    });

    await page.goto("/chat/temporary");

    const textarea = page.getByPlaceholder("Type your message...");
    await expect(textarea).toBeVisible({ timeout: 30_000 });

    await textarea.fill("Hello, can you help me?");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Hello from the")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("assistant!")).toBeVisible();
  });
});
