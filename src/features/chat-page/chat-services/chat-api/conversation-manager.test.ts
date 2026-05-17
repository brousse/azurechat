import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/common/services/logger", () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("@/features/auth-page/helpers", () => ({
  userHashedId: vi.fn(async () => "hashed-user"),
  getCurrentUser: vi.fn(async () => ({ name: "Test", email: "test@example.com", isAdmin: false })),
}));

vi.mock("@/features/persona-page/persona-services/persona-service", () => ({
  FindPersonaByID: vi.fn(async () => ({ status: "NOT_FOUND", errors: [{ message: "not found" }] })),
  FindAllPersonaForCurrentUser: vi.fn(async () => ({ status: "OK", response: [] })),
}));

vi.mock("@/features/persona-page/persona-services/persona-documents-service", () => ({
  AllowedPersonaDocumentIds: vi.fn(async () => []),
}));

vi.mock("../azure-ai-search/azure-ai-search", () => ({
  SimilaritySearch: vi.fn(async () => ({ status: "OK", response: [] })),
}));

vi.mock("../citation-service", () => ({
  CreateCitations: vi.fn(async () => []),
  FormatCitations: vi.fn((docs: any[]) => docs),
}));

import {
  createConversationState,
  startConversation,
  processFunctionCall,
  ConversationState,
  ConversationContext,
} from "./conversation-manager";
import { registerFunction } from "./function-registry";

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
  const responsesCreate = vi.fn(async () => ({}));
  return {
    chatThread: {
      id: "t1",
      name: "Test",
      userId: "hashed",
      createdAt: new Date(),
      lastMessageAt: new Date(),
      bookmarked: false,
      isDeleted: false,
      type: "CHAT_THREAD",
      personaMessage: "",
      personaMessageTitle: "Test",
      extension: [],
      personaDocumentIds: [],
      selectedModel: "gpt-5.4",
      useName: "Test User",
      isTemporary: false,
    } as any,
    userMessage: "hello",
    signal: new AbortController().signal,
    openaiInstance: { responses: { create: responsesCreate } },
    requestOptions: { model: "gpt-5.4", stream: true },
    ...overrides,
  };
}

describe("chat-page.unit.conv-mgr.001 — createConversationState clones initialInput and stamps messageId", () => {
  it("returns cloned input and 36-char messageId", async () => {
    const input = [
      { type: "message" as const, role: "user" as const, content: "hello" },
      { type: "message" as const, role: "user" as const, content: "world" },
    ];
    const state = await createConversationState(makeContext(), input);

    // messageId should be 36-char uniqueId
    expect(state.messageId).toBeTruthy();
    expect(state.messageId!.length).toBe(36);

    // Mutating the original input should not affect state
    (input as any).push({ type: "message", role: "user", content: "extra" });
    expect(state.conversationInput.length).toBe(2);
  });
});

describe("chat-page.unit.conv-mgr.002 — startConversation calls responses.create with stream:true and signal", () => {
  it("forwards stream=true and signal", async () => {
    const responsesCreate = vi.fn(async () => ({}));
    const signal = new AbortController().signal;
    const ctx = makeContext({
      openaiInstance: { responses: { create: responsesCreate } },
      requestOptions: { model: "gpt-5.4" },
    });
    ctx.signal = signal;
    const state = await createConversationState(ctx, [
      { type: "message" as const, role: "user" as const, content: "hi" },
    ]);
    await startConversation(state);

    expect(responsesCreate).toHaveBeenCalledOnce();
    const callArgs = responsesCreate.mock.calls[0];
    expect(callArgs[0]).toMatchObject({ stream: true, input: state.conversationInput });
    expect(callArgs[1]).toMatchObject({ signal });
  });
});

describe("chat-page.unit.conv-mgr.003 — processFunctionCall integrates result and updates state", () => {
  it("success=true and updatedState includes function_call and output", async () => {
    await registerFunction("ok_fn", async () => "ok");
    const state = await createConversationState(makeContext(), [
      { type: "message" as const, role: "user" as const, content: "test" },
    ]);
    const result = await processFunctionCall(state, {
      name: "ok_fn",
      arguments: "{}",
      call_id: "call-1",
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe("ok");

    const input = result.updatedState.conversationInput;
    const hasCall = input.some((i: any) => i.type === "function_call" && i.name === "ok_fn");
    const hasOutput = input.some((i: any) => i.type === "function_call_output" && i.call_id === "call-1");
    expect(hasCall).toBe(true);
    expect(hasOutput).toBe(true);
  });
});

describe("chat-page.unit.conv-mgr.004 — processFunctionCall returns success:true with error JSON when fn throws", () => {
  it("executeFunction swallows error — processFunctionCall sees success=true with error in output", async () => {
    // NOTE: executeFunction catches all errors and wraps them as JSON output.
    // processFunctionCall therefore always returns success=true (no throw path from executeFunction).
    // The error surface is via result.output containing JSON with "error" key.
    await registerFunction("fail_fn2", async () => { throw new Error("internal error"); });
    const state = await createConversationState(makeContext(), []);
    const result = await processFunctionCall(state, {
      name: "fail_fn2",
      arguments: "{}",
      call_id: "call-2",
    });

    // executeFunction wraps the error → output is JSON with "error" key
    expect(result.success).toBe(true);
    const parsed = JSON.parse(result.result!);
    expect(parsed.error).toContain("Function execution failed");
  });
});
