import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Capture the chat.completions.create call + control its response.
const mockCreate = vi.fn();
vi.mock("@/features/common/services/openai", () => ({
  OpenAIMiniInstance: () => ({
    chat: { completions: { create: (...a: unknown[]) => mockCreate(...a) } },
  }),
}));

import { ChatApiTitleAndIntent } from "../chat-api-text";

function reply(content: string) {
  return { choices: [{ message: { content } }] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ChatApiTitleAndIntent", () => {
  it("parses a clean JSON object", async () => {
    mockCreate.mockResolvedValue(reply('{"title":"Fix my test","intent":"coding"}'));
    const r = await ChatApiTitleAndIntent("help with NUnit");
    expect(r).toEqual({ title: "Fix my test", intent: "coding" });
  });

  it("tolerates code fences / surrounding prose", async () => {
    mockCreate.mockResolvedValue(
      reply('Sure!\n```json\n{"title":"Translate doc","intent":"translation"}\n```'),
    );
    const r = await ChatApiTitleAndIntent("translate this");
    expect(r.title).toBe("Translate doc");
    expect(r.intent).toBe("translation");
  });

  it("falls back to general for an unknown intent value", async () => {
    mockCreate.mockResolvedValue(reply('{"title":"Whatever","intent":"banana"}'));
    const r = await ChatApiTitleAndIntent("x");
    expect(r.intent).toBe("general");
  });

  it("clamps the title to 40 chars and strips quotes/colons", async () => {
    const long = "A".repeat(60);
    mockCreate.mockResolvedValue(reply(`{"title":"${long}: \\"x\\"","intent":"general"}`));
    const r = await ChatApiTitleAndIntent("x");
    expect(r.title.length).toBeLessThanOrEqual(40);
    expect(r.title).not.toMatch(/["':]/);
  });

  it("returns safe defaults on malformed (non-JSON) output", async () => {
    mockCreate.mockResolvedValue(reply("totally not json"));
    const r = await ChatApiTitleAndIntent("x");
    expect(r).toEqual({ title: "", intent: "general" });
  });

  it("returns safe defaults when the API call throws (never blocks the chat)", async () => {
    mockCreate.mockRejectedValue(new Error("boom"));
    const r = await ChatApiTitleAndIntent("x");
    expect(r).toEqual({ title: "", intent: "general" });
  });

  it("truncates the user prompt to 300 chars before sending", async () => {
    mockCreate.mockResolvedValue(reply('{"title":"t","intent":"general"}'));
    await ChatApiTitleAndIntent("B".repeat(1000));
    const body = mockCreate.mock.calls[0][0] as {
      messages: { content: { text: string }[] }[];
    };
    const sent = body.messages[0].content[0].text;
    const match = sent.match(/USERPROMPT: (B+)$/);
    expect(match).toBeTruthy();
    expect(match![1].length).toBe(300);
  });
});
