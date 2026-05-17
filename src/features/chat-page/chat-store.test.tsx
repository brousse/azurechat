/**
 * chat-store tests — deferred pure-store logic is exercised here via direct
 * mutation of the proxy state, without rendering React components.
 *
 * The streaming / SSE path (chat(), createStreamParser()) is a pure-passthrough
 * to the network; those branches are deferred to integration tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Silence logger in tests
vi.mock("../common/services/logger", () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("eventsource-parser", () => ({
  createParser: vi.fn(() => ({ feed: vi.fn() })),
}));

vi.mock("../common/navigation-helpers", () => ({
  RevalidateCache: vi.fn(),
}));

vi.mock("@/features/globals/global-message-store", () => ({
  showError: vi.fn(),
}));

vi.mock("@/features/common/util", () => ({
  uniqueId: vi.fn(() => "uid-" + Math.random().toString(36).slice(2)),
}));

vi.mock("./chat-input/speech/use-text-to-speech", () => ({
  textToSpeechStore: { speak: vi.fn() },
}));

vi.mock("@/features/ui/chat/chat-input-area/input-image-store", () => ({
  InputImageStore: { Reset: vi.fn() },
}));

vi.mock("./chat-services/chat-thread-service", () => ({
  AddExtensionToChatThread: vi.fn().mockResolvedValue({ status: "OK" }),
  RemoveExtensionFromChatThread: vi.fn().mockResolvedValue({ status: "OK" }),
  UpdateChatTitle: vi.fn().mockResolvedValue({ status: "OK" }),
  UpdateChatThreadSelectedModel: vi.fn().mockResolvedValue({ status: "OK" }),
  UpdateChatThreadReasoningEffort: vi.fn().mockResolvedValue({ status: "OK" }),
}));

vi.mock("./chat-services/chat-message-service", () => ({
  UpsertChatMessage: vi.fn().mockResolvedValue({}),
}));

import { chatStore } from "./chat-store";
import type { ChatThreadModel, ChatMessageModel } from "./chat-services/models";

const makeChatThread = (overrides: Partial<ChatThreadModel> = {}): ChatThreadModel => ({
  id: "thread1",
  name: "Test Chat",
  personaMessage: "",
  personaMessageTitle: "",
  extension: [],
  type: "CHAT_THREAD",
  isDeleted: false,
  userId: "",
  useName: "User",
  bookmarked: false,
  lastMessageAt: new Date().toISOString(),
  createdAt: new Date(),
  personaDocumentIds: [],
  selectedModel: "gpt-4o",
  reasoningEffort: undefined,
  defaultTools: undefined,
  attachedFiles: [],
  usage: undefined,
  ...overrides,
});

const makeMessage = (overrides: Partial<ChatMessageModel> = {}): ChatMessageModel => ({
  id: "msg1",
  role: "user",
  content: "hello",
  name: "User",
  createdAt: new Date(),
  isDeleted: false,
  threadId: "thread1",
  type: "CHAT_MESSAGE",
  userId: "",
  multiModalImage: "",
  ...overrides,
});

describe("chat-page.unit.store — ChatStore", () => {
  beforeEach(() => {
    // Reset the store to a clean state before each test by calling initChatSession
    // on a fresh thread with no messages
    vi.clearAllMocks();
    chatStore.initChatSession({
      chatThread: makeChatThread({ id: "fresh-thread-" + Date.now() }),
      messages: [],
      userName: "Tester",
    });
  });

  describe("initChatSession", () => {
    it("sets chatThreadId from the provided thread", () => {
      const t = makeChatThread({ id: "abc" });
      chatStore.initChatSession({ chatThread: t, messages: [], userName: "U" });
      expect(chatStore.chatThreadId).toBe("abc");
    });

    it("loads messages from the provided array", () => {
      const msgs = [makeMessage({ id: "m1" }), makeMessage({ id: "m2" })];
      chatStore.initChatSession({
        chatThread: makeChatThread({ id: "abc2" }),
        messages: msgs,
        userName: "U",
      });
      expect(chatStore.messages).toHaveLength(2);
    });

    it("skips re-initialisation for the same thread id", () => {
      const t = makeChatThread({ id: "same" });
      chatStore.initChatSession({ chatThread: t, messages: [makeMessage()], userName: "U" });
      const countAfterFirst = chatStore.messages.length;

      // Second call with same id and different messages — should NOT re-init
      chatStore.initChatSession({
        chatThread: t,
        messages: [makeMessage(), makeMessage({ id: "m2" }), makeMessage({ id: "m3" })],
        userName: "U",
      });
      expect(chatStore.messages.length).toBe(countAfterFirst);
    });

    it("applies defaultTools from the thread", () => {
      chatStore.initChatSession({
        chatThread: makeChatThread({
          id: "dt",
          defaultTools: { webSearch: true, imageGeneration: false, companyContent: true, codeInterpreter: false },
        }),
        messages: [],
        userName: "U",
      });
      expect(chatStore.webSearchEnabled).toBe(true);
      expect(chatStore.imageGenerationEnabled).toBe(false);
      expect(chatStore.companyContentEnabled).toBe(true);
      expect(chatStore.codeInterpreterEnabled).toBe(false);
    });

    it("auto-enables codeInterpreter when a code-interpreter file is attached", () => {
      chatStore.initChatSession({
        chatThread: makeChatThread({
          id: "ci",
          attachedFiles: [{ id: "f1", name: "data.csv", type: "code-interpreter", uploadedAt: new Date() }],
        }),
        messages: [],
        userName: "U",
      });
      expect(chatStore.codeInterpreterEnabled).toBe(true);
    });

    it("sets lastUsageData from thread.usage when present", () => {
      chatStore.initChatSession({
        chatThread: makeChatThread({
          id: "ud",
          usage: { totalInputTokens: 1000, totalOutputTokens: 200, totalCostUsd: 0.01 },
        }),
        messages: [],
        userName: "U",
      });
      expect(chatStore.lastUsageData).not.toBeNull();
      expect(chatStore.lastUsageData?.threadTotalTokens).toBe(1200);
    });

    it("sets lastUsageData to null when no thread.usage", () => {
      chatStore.initChatSession({
        chatThread: makeChatThread({ id: "noud" }),
        messages: [],
        userName: "U",
      });
      expect(chatStore.lastUsageData).toBeNull();
    });
  });

  describe("removeMessages", () => {
    it("clears all messages when called with no options", () => {
      chatStore.initChatSession({
        chatThread: makeChatThread({ id: "rm1" }),
        messages: [makeMessage({ id: "a" }), makeMessage({ id: "b" })],
        userName: "U",
      });
      chatStore.removeMessages();
      expect(chatStore.messages).toHaveLength(0);
    });

    it("removes messages after the given fromMessageId", () => {
      chatStore.initChatSession({
        chatThread: makeChatThread({ id: "rm2" }),
        messages: [
          makeMessage({ id: "a" }),
          makeMessage({ id: "b" }),
          makeMessage({ id: "c" }),
        ],
        userName: "U",
      });
      chatStore.removeMessages({ fromMessageId: "b" });
      // "b" is kept; "c" (after it) is removed
      expect(chatStore.messages.map(m => m.id)).toEqual(["a", "b"]);
    });
  });

  describe("toggleWebSearch / toggleImageGeneration / toggleCompanyContent / toggleCodeInterpreter", () => {
    it("toggleWebSearch sets webSearchEnabled", () => {
      chatStore.toggleWebSearch(true);
      expect(chatStore.webSearchEnabled).toBe(true);
      chatStore.toggleWebSearch(false);
      expect(chatStore.webSearchEnabled).toBe(false);
    });

    it("toggleWebSearch resets reasoningEffort from minimal when enabled", () => {
      chatStore.reasoningEffort = "minimal";
      chatStore.toggleWebSearch(true);
      expect(chatStore.reasoningEffort).toBe("low");
    });

    it("toggleImageGeneration sets imageGenerationEnabled", () => {
      chatStore.toggleImageGeneration(true);
      expect(chatStore.imageGenerationEnabled).toBe(true);
      chatStore.toggleImageGeneration(false);
      expect(chatStore.imageGenerationEnabled).toBe(false);
    });

    it("toggleCompanyContent sets companyContentEnabled", () => {
      chatStore.toggleCompanyContent(true);
      expect(chatStore.companyContentEnabled).toBe(true);
      chatStore.toggleCompanyContent(false);
      expect(chatStore.companyContentEnabled).toBe(false);
    });

    it("toggleCodeInterpreter sets codeInterpreterEnabled", () => {
      chatStore.toggleCodeInterpreter(true);
      expect(chatStore.codeInterpreterEnabled).toBe(true);
      chatStore.toggleCodeInterpreter(false);
      expect(chatStore.codeInterpreterEnabled).toBe(false);
    });
  });

  describe("attached files", () => {
    beforeEach(() => {
      chatStore.initChatSession({
        chatThread: makeChatThread({ id: "af" }),
        messages: [],
        userName: "U",
      });
    });

    it("addAttachedFile appends a file", () => {
      chatStore.addAttachedFile({ id: "f1", name: "test.csv", type: "code-interpreter", uploadedAt: new Date() });
      expect(chatStore.attachedFiles).toHaveLength(1);
      expect(chatStore.attachedFiles[0].name).toBe("test.csv");
    });

    it("removeAttachedFile removes by id", () => {
      chatStore.addAttachedFile({ id: "f1", name: "a.csv", type: "code-interpreter", uploadedAt: new Date() });
      chatStore.addAttachedFile({ id: "f2", name: "b.csv", type: "code-interpreter", uploadedAt: new Date() });
      chatStore.removeAttachedFile("f1");
      expect(chatStore.attachedFiles.map(f => f.id)).toEqual(["f2"]);
    });

    it("clearAttachedFiles empties the array", () => {
      chatStore.addAttachedFile({ id: "f1", name: "a.csv", type: "code-interpreter", uploadedAt: new Date() });
      chatStore.clearAttachedFiles();
      expect(chatStore.attachedFiles).toHaveLength(0);
    });

    it("getCodeInterpreterFileIds returns only code-interpreter file ids", () => {
      chatStore.setAttachedFiles([
        { id: "ci1", name: "x.csv", type: "code-interpreter", uploadedAt: new Date() },
        { id: "sp1", name: "y.pdf", type: "sharepoint", uploadedAt: new Date() },
      ]);
      expect(chatStore.getCodeInterpreterFileIds()).toEqual(["ci1"]);
    });
  });

  describe("tool call tracking", () => {
    it("addToolCall creates history entry for a message", () => {
      chatStore.addToolCall("m1", "search", '{"q":"test"}', "call-1");
      expect(chatStore.getToolCallHistoryForMessage("m1")).toHaveLength(1);
      expect(chatStore.getToolCallHistoryForMessage("m1")[0].name).toBe("search");
    });

    it("completeToolCall sets result on the matching call", () => {
      chatStore.addToolCall("m1", "search", '{"q":"test"}', "call-1");
      chatStore.completeToolCall("m1", "result text", "call-1");
      expect(chatStore.getToolCallHistoryForMessage("m1")[0].result).toBe("result text");
    });

    it("isToolCallInProgress returns true while in progress and false after completion", () => {
      chatStore.addToolCall("m2", "fetch", "{}", "call-2");
      expect(chatStore.isToolCallInProgress("m2")).toBe(true);
      chatStore.completeToolCall("m2", "done", "call-2");
      expect(chatStore.isToolCallInProgress("m2")).toBe(false);
    });
  });

  describe("stopGeneratingMessages", () => {
    it("sets loading to idle and phase to idle", () => {
      chatStore.loading = "loading";
      chatStore.phase = "streaming";
      chatStore.stopGeneratingMessages();
      expect(chatStore.loading).toBe("idle");
      expect(chatStore.phase).toBe("idle");
    });
  });

  describe("updateInput / updateAutoScroll", () => {
    it("updateInput changes the input value", () => {
      chatStore.updateInput("Hello world");
      expect(chatStore.input).toBe("Hello world");
    });

    it("updateAutoScroll changes autoScroll", () => {
      chatStore.updateAutoScroll(false);
      expect(chatStore.autoScroll).toBe(false);
      chatStore.updateAutoScroll(true);
      expect(chatStore.autoScroll).toBe(true);
    });
  });
});
