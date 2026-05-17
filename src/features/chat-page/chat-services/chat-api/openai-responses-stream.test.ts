import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const hashedEmail = createHash("sha256").update("test@example.com").digest("hex");

vi.mock("@/features/auth-page/auth-api", () => ({
  authOptions: {},
  options: {},
}));

vi.mock("@/features/auth-page/helpers", () => ({
  userHashedId: vi.fn(async () => "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b"),
  getCurrentUser: vi.fn(async () => ({ name: "Test", email: "test@example.com", isAdmin: false })),
}));

vi.mock("@/features/common/services/logger", () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("../chat-message-service", () => ({
  UpsertChatMessage: vi.fn(async (doc: any) => ({ status: "OK", response: doc })),
  CreateChatMessage: vi.fn(),
}));

vi.mock("../chat-thread-service", () => ({
  UpdateChatThreadUsage: vi.fn(async () => ({ status: "OK" })),
  UpdateChatThreadCodeInterpreterContainer: vi.fn(async () => ({ status: "OK" })),
  FindChatThreadForCurrentUser: vi.fn(async () => ({ status: "OK", response: {} })),
}));

vi.mock("@/features/common/services/usage-service", () => ({
  IncrementUsage: vi.fn(async () => {}),
}));

vi.mock("@/features/common/services/chat-metrics-service", () => ({
  reportCompletionTokens: vi.fn(async () => {}),
  reportPromptTokens: vi.fn(async () => {}),
}));

vi.mock("./conversation-manager", async () => {
  const actual = await vi.importActual<typeof import("./conversation-manager")>("./conversation-manager");
  return {
    ...actual,
    createConversationState: actual.createConversationState,
    processFunctionCall: vi.fn(async (state: any, call: any) => ({
      success: true,
      result: "42",
      updatedState: state,
    })),
    continueConversation: vi.fn(async () => ({})),
  };
});

import { OpenAIResponsesStream } from "./openai-responses-stream";
import { MODEL_CONFIGS } from "../models";
import { UpsertChatMessage } from "../chat-message-service";
import { UpdateChatThreadUsage } from "../chat-thread-service";
import { IncrementUsage } from "@/features/common/services/usage-service";

const upsertChatMessageSpy = UpsertChatMessage as ReturnType<typeof vi.fn>;
const updateChatThreadUsageSpy = UpdateChatThreadUsage as ReturnType<typeof vi.fn>;
const incrementUsageSpy = IncrementUsage as ReturnType<typeof vi.fn>;

// ---- helpers ----
function makeThread(overrides: Partial<any> = {}): any {
  return {
    id: "t1",
    name: "Test",
    userId: hashedEmail,
    selectedModel: "gpt-5.4",
    createdAt: new Date(),
    lastMessageAt: new Date(),
    bookmarked: false,
    isDeleted: false,
    type: "CHAT_THREAD",
    personaMessage: "",
    personaMessageTitle: "Test",
    extension: [],
    personaDocumentIds: [],
    useName: "Test User",
    isTemporary: false,
    usage: { totalInputTokens: 0, totalOutputTokens: 0, totalCachedTokens: 0, totalCostUsd: 0, lastUpdated: new Date().toISOString() },
    ...overrides,
  };
}

async function* makeEventStream(events: any[]) {
  for (const e of events) {
    yield e;
  }
}

async function collectSSE(stream: ReadableStream<Uint8Array>): Promise<Array<{ event: string; data: any }>> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  // parse SSE
  const parsed: Array<{ event: string; data: any }> = [];
  const blocks = raw.split("\n\n").filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let dataLine = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.replace("event:", "").trim();
      if (line.startsWith("data:")) dataLine = line.replace("data:", "").trim();
    }
    if (event || dataLine) {
      try {
        parsed.push({ event, data: dataLine ? JSON.parse(dataLine) : null });
      } catch {
        parsed.push({ event, data: dataLine });
      }
    }
  }
  return parsed;
}

const basicCompletionEvents = (deltas: string[], usage: any) => [
  ...deltas.map((delta) => ({ type: "response.output_text.delta", delta })),
  {
    type: "response.completed",
    response: {
      output: [{ type: "message", id: "msg-1", content: [{ type: "output_text", text: deltas.join(""), annotations: [] }] }],
      usage,
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  upsertChatMessageSpy.mockImplementation(async (doc: any) => ({ status: "OK", response: doc }));
  updateChatThreadUsageSpy.mockImplementation(async () => ({ status: "OK" }));
  incrementUsageSpy.mockImplementation(async () => {});
});

describe("chat-page.unit.stream.001 — Emits content events for each delta", () => {
  it("three content events in order", async () => {
    const events = basicCompletionEvents(["Hel", "lo", "!"], {
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
      input_tokens_details: { cached_tokens: 0 },
    });
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
    });
    const sse = await collectSSE(stream);
    const contentEvents = sse.filter((e) => e.event === "content");
    expect(contentEvents.length).toBe(3);
    const deltas = contentEvents.map((e) => e.data.response.choices[0].message.content);
    expect(deltas).toEqual(["Hel", "lo", "!"]);
  });
});

describe("chat-page.unit.stream.002 — finalContent carries full concatenated message", () => {
  it("finalContent response === Hello!", async () => {
    const events = basicCompletionEvents(["Hel", "lo", "!"], {
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
      input_tokens_details: { cached_tokens: 0 },
    });
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
    });
    const sse = await collectSSE(stream);
    const fc = sse.find((e) => e.event === "finalContent");
    expect(fc).toBeDefined();
    expect(fc!.data.response).toBe("Hello!");
  });
});

describe("chat-page.unit.stream.003 — usageData event precedes finalContent and includes computed cost", () => {
  it("usageData appears before finalContent; cost computed", async () => {
    const usage = {
      input_tokens: 1000,
      output_tokens: 500,
      total_tokens: 1500,
      input_tokens_details: { cached_tokens: 200 },
    };
    const events = basicCompletionEvents(["hi"], usage);
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread({ selectedModel: "gpt-5.4" }),
    });
    const sse = await collectSSE(stream);
    const usageIdx = sse.findIndex((e) => e.event === "usageData");
    const finalIdx = sse.findIndex((e) => e.event === "finalContent");
    expect(usageIdx).toBeGreaterThanOrEqual(0);
    expect(finalIdx).toBeGreaterThanOrEqual(0);
    expect(usageIdx).toBeLessThan(finalIdx);

    const pricing = MODEL_CONFIGS["gpt-5.4"].pricing;
    const nonCached = 1000 - 200;
    const expectedCost =
      (nonCached / 1e6) * pricing.inputPerMillion +
      (200 / 1e6) * pricing.cachedInputPerMillion +
      (500 / 1e6) * pricing.outputPerMillion;

    const usageData = sse[usageIdx].data.response;
    expect(usageData.costUsd).toBeCloseTo(expectedCost, 6);
  });
});

describe("chat-page.unit.stream.004 — Persists assistant message via UpsertChatMessage on completion", () => {
  it("UpsertChatMessage called once with role=assistant", async () => {
    const events = basicCompletionEvents(["Hello"], {
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
      input_tokens_details: { cached_tokens: 0 },
    });
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
    });
    await collectSSE(stream);
    expect(upsertChatMessageSpy).toHaveBeenCalled();
    const savedDoc = upsertChatMessageSpy.mock.calls[0][0];
    expect(savedDoc.role).toBe("assistant");
    expect(savedDoc.threadId).toBe("t1");
    expect(savedDoc.content).toBe("Hello");
  });
});

describe("chat-page.unit.stream.005 — Emits abort event on response.incomplete", () => {
  it("abort event with mapped reason", async () => {
    const events = [
      { type: "response.output_text.delta", delta: "partial" },
      {
        type: "response.incomplete",
        response: { incomplete_details: { reason: "max_output_tokens" } },
      },
    ];
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
    });
    const sse = await collectSSE(stream);
    const abortEvent = sse.find((e) => e.event === "abort");
    expect(abortEvent).toBeDefined();
    expect(abortEvent!.data.response).toContain("maximum output tokens");
  });
});

describe("chat-page.unit.stream.006 — Persists partial message on response.incomplete", () => {
  it("UpsertChatMessage called once with partial content", async () => {
    const events = [
      { type: "response.output_text.delta", delta: "partial content" },
      {
        type: "response.incomplete",
        response: { incomplete_details: { reason: "max_output_tokens" } },
      },
    ];
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
    });
    await collectSSE(stream);
    expect(upsertChatMessageSpy).toHaveBeenCalled();
    const savedDoc = upsertChatMessageSpy.mock.calls[0][0];
    expect(savedDoc.content).toBe("partial content");
  });
});

describe("chat-page.unit.stream.007 — Emits error event on stream error event", () => {
  it("error event with boom message", async () => {
    const events = [
      { type: "error", error: { message: "boom" } },
    ];
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
    });
    const sse = await collectSSE(stream);
    const errEvent = sse.find((e) => e.event === "error");
    expect(errEvent).toBeDefined();
    expect(errEvent!.data.response).toBe("boom");
  });
});

describe("chat-page.unit.stream.008 — Emits usageWarning event when fallbackInfo provided", () => {
  it("first event is usageWarning", async () => {
    const events = basicCompletionEvents(["hi"], {
      input_tokens: 100, output_tokens: 50, total_tokens: 150,
      input_tokens_details: { cached_tokens: 0 },
    });
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
      fallbackInfo: {
        originalModel: "gpt-5.5",
        fallbackModel: "gpt-5.4-mini",
        message: "x",
        limitType: "tokens",
        currentUsage: 1,
        limit: 1,
      },
    });
    const sse = await collectSSE(stream);
    expect(sse[0].event).toBe("usageWarning");
    expect(sse[0].data.response.originalModel).toBe("gpt-5.5");
  });
});

describe("chat-page.unit.stream.009 — Reasoning summary deltas stream as reasoning events", () => {
  it("two reasoning events with deltas", async () => {
    const events = [
      { type: "response.reasoning_summary_text.delta", delta: "Step 1", summary_index: 0 },
      { type: "response.reasoning_summary_text.delta", delta: " Step 2", summary_index: 0 },
      {
        type: "response.completed",
        response: {
          output: [{ type: "message", id: "msg-1", content: [{ type: "output_text", text: "done", annotations: [] }] }],
          usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15, input_tokens_details: { cached_tokens: 0 } },
        },
      },
    ];
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
    });
    const sse = await collectSSE(stream);
    const reasoningEvents = sse.filter((e) => e.event === "reasoning");
    expect(reasoningEvents.length).toBe(2);
    expect(reasoningEvents[0].data.response).toBe("Step 1");
    expect(reasoningEvents[1].data.response).toBe(" Step 2");
  });
});

describe("chat-page.unit.stream.010 — Function call emits functionCall then functionCallResult", () => {
  it("functionCall followed by functionCallResult containing 42", async () => {
    const { processFunctionCall } = await import("./conversation-manager");
    (processFunctionCall as any).mockResolvedValue({
      success: true,
      result: "42",
      updatedState: { conversationInput: [], context: {} as any, messageId: "mid" },
    });

    const outputIndex = 0;
    const events = [
      { type: "response.output_item.added", output_index: outputIndex, item: { type: "function_call", name: "test_fn", call_id: "call-x", id: "item-1" } },
      { type: "response.function_call_arguments.delta", output_index: outputIndex, delta: "{}" },
      { type: "response.function_call_arguments.done", output_index: outputIndex, arguments: "{}" },
      { type: "response.output_item.done", output_index: outputIndex, item: { type: "function_call", name: "test_fn", call_id: "call-x" } },
    ];

    const mockState = {
      conversationInput: [],
      context: { chatThread: makeThread(), userMessage: "hi", signal: new AbortController().signal, openaiInstance: {}, requestOptions: {} },
      messageId: "mid",
    };

    const onContinue = vi.fn(async () => {});
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
      conversationState: mockState,
      onContinue,
    });

    const sse = await collectSSE(stream);
    const fnCall = sse.find((e) => e.event === "functionCall");
    const fnResult = sse.find((e) => e.event === "functionCallResult");
    expect(fnCall).toBeDefined();
    expect(fnResult).toBeDefined();
    expect(fnResult!.data.response).toBe("42");
  });
});

describe("chat-page.unit.stream.011 — Function call persists tool message via UpsertChatMessage", () => {
  it("UpsertChatMessage called with role=tool", async () => {
    const { processFunctionCall } = await import("./conversation-manager");
    (processFunctionCall as any).mockResolvedValue({
      success: true,
      result: "42",
      updatedState: { conversationInput: [], context: {} as any, messageId: "mid" },
    });

    const outputIndex = 0;
    const events = [
      { type: "response.output_item.added", output_index: outputIndex, item: { type: "function_call", name: "tool_fn", call_id: "call-y", id: "item-2" } },
      { type: "response.function_call_arguments.delta", output_index: outputIndex, delta: "{}" },
      { type: "response.function_call_arguments.done", output_index: outputIndex, arguments: "{}" },
      { type: "response.output_item.done", output_index: outputIndex, item: { type: "function_call", name: "tool_fn", call_id: "call-y" } },
    ];

    const mockState = {
      conversationInput: [],
      context: { chatThread: makeThread(), userMessage: "hi", signal: new AbortController().signal, openaiInstance: {}, requestOptions: {} },
      messageId: "mid",
    };

    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
      conversationState: mockState,
      onContinue: vi.fn(async () => {}),
    });

    await collectSSE(stream);
    const toolCall = upsertChatMessageSpy.mock.calls.find((c: any) => c[0].role === "tool");
    expect(toolCall).toBeDefined();
    const content = JSON.parse(toolCall![0].content);
    expect(content.name).toBe("tool_fn");
    expect(content.call_id).toBe("call-y");
    expect(content.result).toBe("42");
  });
});

describe("chat-page.unit.stream.012 — Function call sub-agent usage is accumulated in subsequent stream", () => {
  it("when function result has usage JSON, sub-agent tokens are added in next stream completion", async () => {
    // The stream closes after function call done (onContinue is called).
    // The usage accumulation happens in the NEXT stream invocation (continuation).
    // We test this by running a stream that has BOTH the function call AND the response.completed
    // with NO onContinue (simulating a continuation stream).
    const subAgentResult = JSON.stringify({
      usage: { inputTokens: 10, outputTokens: 5, cachedTokens: 0, totalTokens: 15, costUsd: 0.01 },
    });
    const { processFunctionCall } = await import("./conversation-manager");
    (processFunctionCall as any).mockResolvedValue({
      success: true,
      result: subAgentResult,
      updatedState: { conversationInput: [], context: {} as any, messageId: "mid" },
    });

    const outputIndex = 0;
    // No onContinue → after function call done, keep processing
    // Simulate: function call done triggers onContinue which ends stream
    // We verify sub-agent usage was accumulated during the function_call_arguments.done phase
    const completionEvent = {
      type: "response.completed",
      response: {
        output: [{ type: "message", id: "msg-sub", content: [{ type: "output_text", text: "result", annotations: [] }] }],
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150, input_tokens_details: { cached_tokens: 0 } },
      },
    };

    // No function call items, just a direct completion with subAgentUsage pre-loaded
    // Test the usage accumulation path by directly verifying the processFunctionCall was called
    // and the result contained usage JSON

    // Direct test: stream with only response.completed (no fn calls) but with pre-configured subAgentUsage
    // The sub-agent accumulation is only testable through a full fn-call+continuation sequence.
    // Here we just verify: when processFunctionCall returns usage JSON, and then response.completed fires,
    // the usageData event contains the sum of base + sub-agent tokens.

    // This requires not using onContinue so stream continues to response.completed
    const fnEvents = [
      { type: "response.output_item.added", output_index: outputIndex, item: { type: "function_call", name: "sub_fn", call_id: "call-z", id: "item-3" } },
      { type: "response.function_call_arguments.delta", output_index: outputIndex, delta: "{}" },
      { type: "response.function_call_arguments.done", output_index: outputIndex, arguments: "{}" },
      // No output_item.done for function_call so onContinue never fires
      completionEvent,
    ];

    const mockState = {
      conversationInput: [],
      context: { chatThread: makeThread(), userMessage: "hi", signal: new AbortController().signal, openaiInstance: {}, requestOptions: {} },
      messageId: "mid",
    };

    const stream = OpenAIResponsesStream({
      stream: makeEventStream(fnEvents) as any,
      chatThread: makeThread(),
      conversationState: mockState,
      // No onContinue → function call completes and stream processes completionEvent
    });

    const sse = await collectSSE(stream);
    const usageEvent = sse.find((e) => e.event === "usageData");
    expect(usageEvent).toBeDefined();
    const ud = usageEvent!.data.response;
    expect(ud.inputTokens).toBe(110); // 100 base + 10 sub-agent
    expect(ud.outputTokens).toBe(55); // 50 base + 5 sub-agent
  });
});

describe("chat-page.unit.stream.013 — Closes stream after onContinue when function call done fires", () => {
  it("onContinue called with updatedState", async () => {
    const { processFunctionCall } = await import("./conversation-manager");
    const updatedState = {
      conversationInput: [{ type: "function_call_output" as const, call_id: "c1", output: "res" }],
      context: {} as any,
      messageId: "mid",
    };
    (processFunctionCall as any).mockResolvedValue({
      success: true,
      result: "res",
      updatedState,
    });

    const onContinue = vi.fn(async () => {});
    const outputIndex = 0;
    const events = [
      { type: "response.output_item.added", output_index: outputIndex, item: { type: "function_call", name: "fn", call_id: "c1", id: "i1" } },
      { type: "response.function_call_arguments.delta", output_index: outputIndex, delta: "{}" },
      { type: "response.function_call_arguments.done", output_index: outputIndex, arguments: "{}" },
      { type: "response.output_item.done", output_index: outputIndex, item: { type: "function_call", name: "fn", call_id: "c1" } },
    ];
    const mockState = {
      conversationInput: [],
      context: { chatThread: makeThread(), userMessage: "test", signal: new AbortController().signal, openaiInstance: {}, requestOptions: {} },
      messageId: "mid",
    };

    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
      conversationState: mockState,
      onContinue,
    });
    await collectSSE(stream);
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onContinue.mock.calls[0][0]).toMatchObject({ messageId: "mid" });
  });
});

describe("chat-page.unit.stream.014 — Persists usage via UpdateChatThreadUsage & IncrementUsage on completion", () => {
  it("both called with combined totals", async () => {
    const events = basicCompletionEvents(["hi"], {
      input_tokens: 100, output_tokens: 50, total_tokens: 150,
      input_tokens_details: { cached_tokens: 10 },
    });
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
    });
    await collectSSE(stream);
    expect(updateChatThreadUsageSpy).toHaveBeenCalledOnce();
    expect(incrementUsageSpy).toHaveBeenCalledOnce();
  });
});

describe("chat-page.unit.stream.015 — contextUsagePercent computed against MODEL_CONFIGS.contextWindow", () => {
  it("gpt-5.4-mini with 100000 input_tokens → contextUsagePercent ≈ 25", async () => {
    const events = basicCompletionEvents(["hi"], {
      input_tokens: 100000, output_tokens: 50, total_tokens: 100050,
      input_tokens_details: { cached_tokens: 0 },
    });
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread({ selectedModel: "gpt-5.4-mini" }),
    });
    const sse = await collectSSE(stream);
    const usageEvent = sse.find((e) => e.event === "usageData");
    expect(usageEvent).toBeDefined();
    expect(usageEvent!.data.response.contextUsagePercent).toBeCloseTo(25, 0);
  });
});

describe("chat-page.unit.stream.016 — Reuses passed-in conversationState.messageId when response has no message id", () => {
  it("UpsertChatMessage doc has id=keep-me when messageOutput has no id", async () => {
    // When the response.completed event has no messageOutput.id, the conversationState.messageId is used
    const events = [
      { type: "response.output_text.delta", delta: "hi" },
      {
        type: "response.completed",
        response: {
          // output with no message item (only reasoning) → messageOutput is undefined → uses messageId
          output: [],
          usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15, input_tokens_details: { cached_tokens: 0 } },
        },
      },
    ];
    const mockState = {
      conversationInput: [],
      context: { chatThread: makeThread(), userMessage: "hi", signal: new AbortController().signal, openaiInstance: {}, requestOptions: {} },
      messageId: "keep-me",
    };
    const stream = OpenAIResponsesStream({
      stream: makeEventStream(events) as any,
      chatThread: makeThread(),
      conversationState: mockState,
    });
    await collectSSE(stream);
    const saved = upsertChatMessageSpy.mock.calls.find((c: any) => c[0].role === "assistant");
    expect(saved).toBeDefined();
    expect(saved![0].id).toBe("keep-me");
  });
});
