import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/common/services/logger", () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("@/features/auth-page/helpers", () => ({
  userHashedId: vi.fn(async () => "hashed-user"),
  getCurrentUser: vi.fn(async () => ({ name: "Test", email: "test@example.com", isAdmin: false, token: "tok" })),
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

// We need a fresh module per test for registry isolation
describe("chat-page.unit.fn-registry.001 — executeFunction returns not found for unknown name", () => {
  it("returns error JSON with not found", async () => {
    // Use dynamic import to get a fresh registry state after module reset
    const { executeFunction } = await import("./function-registry");
    const result = await executeFunction(
      { name: "unknown_fn", arguments: {}, call_id: "c1" },
      { conversationContext: {} as any, userMessage: "test", signal: new AbortController().signal }
    );
    expect(result.call_id).toBe("c1");
    const parsed = JSON.parse(result.output);
    expect(parsed.error).toMatch(/not found/i);
  });
});

describe("chat-page.unit.fn-registry.002 — executeFunction stringifies non-string results", () => {
  it("output is JSON for object return", async () => {
    const { executeFunction, registerFunction } = await import("./function-registry");
    await registerFunction("ping_test", async () => ({ pong: 1 }));
    const result = await executeFunction(
      { name: "ping_test", arguments: {}, call_id: "c2" },
      { conversationContext: {} as any, userMessage: "test", signal: new AbortController().signal }
    );
    expect(result.output).toBe('{"pong":1}');
  });
});

describe("chat-page.unit.fn-registry.003 — executeFunction returns string output verbatim", () => {
  it("string result passed through", async () => {
    const { executeFunction, registerFunction } = await import("./function-registry");
    await registerFunction("hello_fn", async () => "hello");
    const result = await executeFunction(
      { name: "hello_fn", arguments: {}, call_id: "c3" },
      { conversationContext: {} as any, userMessage: "test", signal: new AbortController().signal }
    );
    expect(result.output).toBe("hello");
  });
});

describe("chat-page.unit.fn-registry.004 — executeFunction catches implementation errors", () => {
  it("wraps error in output JSON", async () => {
    const { executeFunction, registerFunction } = await import("./function-registry");
    await registerFunction("boom_fn", async () => { throw new Error("exploded"); });
    const result = await executeFunction(
      { name: "boom_fn", arguments: {}, call_id: "c4" },
      { conversationContext: {} as any, userMessage: "test", signal: new AbortController().signal }
    );
    const parsed = JSON.parse(result.output);
    expect(parsed.error).toContain("Function execution failed");
  });
});

describe("chat-page.unit.fn-registry.005 — registerFunction later registration overrides earlier", () => {
  it("last impl wins", async () => {
    const { executeFunction, registerFunction } = await import("./function-registry");
    await registerFunction("over_fn", async () => "first");
    await registerFunction("over_fn", async () => "second");
    const result = await executeFunction(
      { name: "over_fn", arguments: {}, call_id: "c5" },
      { conversationContext: {} as any, userMessage: "test", signal: new AbortController().signal }
    );
    expect(result.output).toBe("second");
  });
});
