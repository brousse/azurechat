import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("./logger", () => ({
  logWarn: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
}));

describe("common.unit.chat-token-service — ChatTokenService", () => {
  it("common.unit.chat-token.001: constructs with default gpt-4 model", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService();
    // Should not throw
    expect(svc).toBeDefined();
  });

  it("common.unit.chat-token.002: constructs with a known valid model", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    expect(svc).toBeDefined();
  });

  it("common.unit.chat-token.003: falls back to gpt-4 encoder for unknown model (logWarn called)", async () => {
    const loggerModule = await import("./logger");
    const warnSpy = vi.spyOn(loggerModule, "logWarn");
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("not-a-real-model");
    // still usable
    const count = svc.getTokenCount("hello world");
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("common.unit.chat-token.004: getTokenCount returns deterministic result", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    const r1 = svc.getTokenCount("The quick brown fox");
    const r2 = svc.getTokenCount("The quick brown fox");
    expect(r1).toBe(r2);
    expect(r1).toBeGreaterThan(0);
  });

  it("common.unit.chat-token.005: getTokenCount for empty string returns 0", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    expect(svc.getTokenCount("")).toBe(0);
  });

  it("common.unit.chat-token.006: getTokenCountFromMessage works with string content", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    const result = svc.getTokenCountFromMessage({ role: "user", content: "Hello world" });
    expect(result).toBeGreaterThan(0);
  });

  it("common.unit.chat-token.007: getTokenCountFromMessage works with empty string content", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    const result = svc.getTokenCountFromMessage({ role: "user", content: "" });
    expect(result).toBe(0);
  });

  it("common.unit.chat-token.008: getTokenCountFromMessage extracts text from multimodal array", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    const multimodal = {
      role: "user",
      content: [
        { type: "text", text: "Describe this image" },
        { type: "image_url", url: "https://example.com/img.png" },
      ],
    };
    const result = svc.getTokenCountFromMessage(multimodal);
    expect(result).toBeGreaterThan(0);
    // Image item is filtered out; only text is counted
    const textOnly = svc.getTokenCount("Describe this image");
    expect(result).toBe(textOnly);
  });

  it("common.unit.chat-token.009: getTokenCountFromMessage returns 0 for empty multimodal array", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    const result = svc.getTokenCountFromMessage({ role: "user", content: [] });
    expect(result).toBe(0);
  });

  it("common.unit.chat-token.010: getTokenCountFromHistory returns per-message breakdown", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    const history = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ];
    const result = svc.getTokenCountFromHistory(history);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[0].tokens).toBeGreaterThan(0);
    expect(result[1].role).toBe("assistant");
    expect(result[1].tokens).toBeGreaterThan(0);
  });

  it("common.unit.chat-token.011: getTokenCountFromHistory handles multimodal messages", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    const history = [
      {
        role: "user",
        content: [
          { type: "text", text: "What do you see?" },
          { type: "image_url", url: "https://example.com/img.png" },
        ],
      },
    ];
    const result = svc.getTokenCountFromHistory(history);
    expect(result).toHaveLength(1);
    expect(result[0].tokens).toBeGreaterThan(0);
  });

  it("common.unit.chat-token.012: getTokenCountFromHistory returns empty array for empty history", async () => {
    const { ChatTokenService } = await import("./chat-token-service");
    const svc = new ChatTokenService("gpt-4");
    const result = svc.getTokenCountFromHistory([]);
    expect(result).toEqual([]);
  });
});
