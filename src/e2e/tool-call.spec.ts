import { test, expect } from "@playwright/test";

// Real-user flow: I ask a question, the model invokes a tool, the tool returns,
// and the model gives a final answer. We assert two things:
//   1. The tool widget appears EXACTLY ONCE for the call (chat-page.tsx renders
//      Tool components from chatStore.toolCallHistory[m.id]; duplicate renders
//      would indicate the history was appended twice or that the tool-role
//      message also rendered its own Tool widget).
//   2. No empty bubble at the end. chat-store.tsx pushes a synthetic
//      `role: "tool"` message into `messages` after the tool result (and the
//      server persists the same to Cosmos for reloads). chat-page.tsx now
//      filters tool/function role messages out of the render loop, since the
//      tool widget is already surfaced via `toolCallHistory` on the assistant
//      message.
//
// We mock /api/chat directly because the fake OpenAI in memory mode does not
// emit functionCall/functionCallResult events on its own.

const TOOL_NAME = "get_weather";
const TOOL_ARGS = '{"city":"Zurich"}';
const TOOL_RESULT = "15 degrees and sunny in Zurich";
const FINAL_ANSWER = "It's 15 degrees and sunny in Zurich right now.";

function ssePayload() {
  return [
    `data: {"type":"functionCall","response":{"name":"${TOOL_NAME}","arguments":${JSON.stringify(
      TOOL_ARGS
    )},"call_id":"call-1"}}\n\n`,
    `data: {"type":"functionCallResult","response":${JSON.stringify(
      TOOL_RESULT
    )},"call_id":"call-1"}\n\n`,
    `data: {"type":"content","response":{"id":"msg-tool-1","choices":[{"message":{"content":${JSON.stringify(
      FINAL_ANSWER
    )}}}]}}\n\n`,
    `data: {"type":"finalContent","response":${JSON.stringify(FINAL_ANSWER)}}\n\n`,
  ].join("");
}

test.describe("tool-call", () => {
  test("question → tool call → answer renders the tool exactly once", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "x-content-type-options": "nosniff",
        },
        body: ssePayload(),
      });
    });

    await page.goto("/chat/temporary");
    const textarea = page.getByPlaceholder("Type your message...");
    await expect(textarea).toBeVisible({ timeout: 30_000 });

    await textarea.fill("What's the weather in Zurich?");
    await page.keyboard.press("Enter");

    // Final answer renders (proves the SSE was consumed end-to-end).
    await expect(page.getByText(FINAL_ANSWER)).toBeVisible({ timeout: 15_000 });

    // The tool widget (ToolHeader renders `<span>tool-<name></span>`)
    // appears exactly once. A regression where toolHistory is duplicated, or
    // where the tool-role message also rendered its own Tool, would push this
    // count to 2.
    await expect(page.getByText(`tool-${TOOL_NAME}`, { exact: true })).toHaveCount(1);

    // Exactly one assistant bubble — the real reply with the tool widget
    // above it. The synthetic tool-role message is filtered out so no empty
    // trailing bubble appears.
    await expect(page.locator(".is-assistant")).toHaveCount(1, { timeout: 5_000 });
    const onlyAssistantText = (await page.locator(".is-assistant").innerText()).trim();
    expect(onlyAssistantText).toContain(FINAL_ANSWER);
    expect(onlyAssistantText).toContain(`tool-${TOOL_NAME}`);
  });
});
