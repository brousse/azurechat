import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const hashedEmail = createHash("sha256").update("test@example.com").digest("hex");

let historyItems: any[] = [];
let queryCapture: any = null;

const historyContainer = {
  items: {
    create: vi.fn(async (doc: any) => ({ resource: doc })),
    upsert: vi.fn(async (doc: any) => ({ resource: doc })),
    query: vi.fn((q: any) => {
      queryCapture = q;
      return { fetchAll: async () => ({ resources: historyItems }) };
    }),
  },
};

vi.mock("@/features/common/services/cosmos", () => ({
  HistoryContainer: () => historyContainer,
}));

vi.mock("@/features/auth-page/auth-api", () => ({
  authOptions: {},
  options: {},
}));

vi.mock("@/features/common/services/logger", () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

import { CreateCitation, CreateCitations, FindCitationByID } from "./citation-service";
import { CHAT_CITATION_ATTRIBUTE } from "./models";

beforeEach(() => {
  historyItems = [];
  queryCapture = null;
  vi.clearAllMocks();
  historyContainer.items.create.mockImplementation(async (doc: any) => ({ resource: doc }));
  historyContainer.items.upsert.mockImplementation(async (doc: any) => ({ resource: doc }));
  historyContainer.items.query.mockImplementation((q: any, _opts?: any) => {
    queryCapture = q;
    return { fetchAll: async () => ({ resources: historyItems }) };
  });
});

describe("chat-page.unit.citation.001 — CreateCitation returns OK on successful create", () => {
  it("returns OK with the resource", async () => {
    const model = {
      id: "c1",
      content: { document: { pageContent: "test" } },
      userId: hashedEmail,
      type: CHAT_CITATION_ATTRIBUTE as const,
    };
    const result = await CreateCitation(model);
    expect(result.status).toBe("OK");
    expect((result as any).response).toMatchObject({ id: "c1" });
  });
});

describe("chat-page.unit.citation.002 — CreateCitation returns ERROR when no resource returned", () => {
  it("returns ERROR Citation not created", async () => {
    historyContainer.items.create.mockResolvedValueOnce({ resource: undefined });
    const model = {
      id: "c1",
      content: {},
      userId: hashedEmail,
      type: CHAT_CITATION_ATTRIBUTE as const,
    };
    const result = await CreateCitation(model);
    expect(result.status).toBe("ERROR");
    expect((result as any).errors[0].message).toBe("Citation not created");
  });
});

describe("chat-page.unit.citation.003 — CreateCitations defaults userId to userHashedId()", () => {
  it("uses hashed email when no userId provided", async () => {
    const docs = [
      { score: 1.0, document: { id: "d1", pageContent: "content", metadata: "meta", chatThreadId: "t1", user: "", personaDocumentId: null } },
      { score: 0.9, document: { id: "d2", pageContent: "content2", metadata: "meta2", chatThreadId: "t1", user: "", personaDocumentId: null } },
    ];
    await CreateCitations(docs);
    const calls = historyContainer.items.create.mock.calls;
    expect(calls.length).toBe(2);
    calls.forEach((call: any) => {
      expect(call[0].userId).toBe(hashedEmail);
    });
  });
});

describe("chat-page.unit.citation.004 — CreateCitations uses provided userId override", () => {
  it("uses explicit userId", async () => {
    const docs = [
      { score: 1.0, document: { id: "d1", pageContent: "content", metadata: "meta", chatThreadId: "t1", user: "", personaDocumentId: null } },
    ];
    await CreateCitations(docs, "explicit");
    const call = historyContainer.items.create.mock.calls[0][0];
    expect(call.userId).toBe("explicit");
  });
});

describe("chat-page.unit.citation.005 — FindCitationByID scopes query by hashed userId", () => {
  it("includes userId in query", async () => {
    historyItems = [{ id: "cit1", type: CHAT_CITATION_ATTRIBUTE, userId: hashedEmail, content: {} }];
    await FindCitationByID("cit1");
    const userParam = queryCapture?.parameters?.find((p: any) => p.name === "@userId");
    expect(userParam?.value).toBe(hashedEmail);
  });
});
