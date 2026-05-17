import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const hashedEmail = createHash("sha256").update("test@example.com").digest("hex");

// Mock Azure AI Search
const mockSearch = vi.fn();
const mockUpload = vi.fn(async () => ({ results: [] }));
const mockDelete = vi.fn(async () => ({ results: [] }));
const mockGetIndex = vi.fn();
const mockCreateIndex = vi.fn();

vi.mock("@/features/auth-page/auth-api", () => ({
  authOptions: {},
  options: {},
}));

vi.mock("@/features/common/services/ai-search", () => ({
  AzureAISearchInstance: vi.fn(() => ({
    search: mockSearch,
    uploadDocuments: mockUpload,
    deleteDocuments: mockDelete,
  })),
  AzureAISearchIndexClientInstance: vi.fn(() => ({
    getIndex: mockGetIndex,
    createIndex: mockCreateIndex,
  })),
}));

const mockEmbeddingsCreate = vi.fn(async () => ({
  data: [{ embedding: new Array(1536).fill(0.1) }],
}));

vi.mock("@/features/common/services/openai", () => ({
  OpenAIEmbeddingInstance: vi.fn(() => ({
    embeddings: { create: mockEmbeddingsCreate },
  })),
  OpenAIV1Instance: vi.fn(() => ({})),
  OpenAIV1ReasoningInstance: vi.fn(() => ({})),
}));

vi.mock("@/features/common/services/logger", () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("@/features/common/services/azure-default-credential", () => ({
  getAzureDefaultCredential: vi.fn(() => ({})),
}));

import {
  SimpleSearch,
  SimilaritySearch,
  IndexDocuments,
  DeleteDocumentsOfChatThread,
  DeleteSearchDocumentByPersonaDocumentId,
  EnsureIndexIsCreated,
} from "./azure-ai-search";

beforeEach(() => {
  vi.clearAllMocks();
  mockSearch.mockResolvedValue({
    results: (async function* () {})(),
  });
  mockUpload.mockResolvedValue({ results: [] });
  mockDelete.mockResolvedValue({ results: [] });
  mockGetIndex.mockResolvedValue({ name: "test-index" });
  mockCreateIndex.mockResolvedValue({ name: "new-index" });
  mockEmbeddingsCreate.mockResolvedValue({
    data: [{ embedding: new Array(1536).fill(0.1) }],
  });
});

async function* makeSearchResultsGen(items: any[]) {
  for (const item of items) {
    yield item;
  }
}

describe("chat-page.unit.search.001 — SimpleSearch iterates async results", () => {
  it("returns OK with 2 results", async () => {
    const docs = [
      { score: 0.9, document: { id: "d1", pageContent: "content1", user: hashedEmail, chatThreadId: "t1", metadata: null, personaDocumentId: null } },
      { score: 0.8, document: { id: "d2", pageContent: "content2", user: hashedEmail, chatThreadId: "t1", metadata: null, personaDocumentId: null } },
    ];
    mockSearch.mockResolvedValueOnce({ results: makeSearchResultsGen(docs) });
    const result = await SimpleSearch("query");
    expect(result.status).toBe("OK");
    expect((result as any).response.length).toBe(2);
  });
});

describe("chat-page.unit.search.002 — SimilaritySearch adds vectorSearchOptions when shouldCreateEmbedding=true", () => {
  it("passes vectorSearchOptions with vector and kNN count", async () => {
    let capturedOptions: any;
    mockSearch.mockImplementationOnce(async (_text: string, options: any) => {
      capturedOptions = options;
      return { results: makeSearchResultsGen([]) };
    });
    await SimilaritySearch("test query", 5, undefined, 0, true);
    expect(mockEmbeddingsCreate).toHaveBeenCalled();
    expect(capturedOptions.vectorSearchOptions).toBeDefined();
    expect(capturedOptions.vectorSearchOptions.queries[0].kNearestNeighborsCount).toBe(5);
    expect(capturedOptions.vectorSearchOptions.queries[0].vector).toHaveLength(1536);
  });
});

describe("chat-page.unit.search.003 — SimilaritySearch skips embedding when flag is false", () => {
  it("does not call OpenAI embeddings", async () => {
    mockSearch.mockResolvedValueOnce({ results: makeSearchResultsGen([]) });
    await SimilaritySearch("query", 3, undefined, 0, false);
    expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
  });
});

describe("chat-page.unit.search.004 — IndexDocuments tags each document with hashed userId", () => {
  it("each uploaded doc has user = hashedEmail", async () => {
    let uploadedDocs: any[] = [];
    mockUpload.mockImplementationOnce(async (docs: any[]) => {
      uploadedDocs = docs;
      return { results: docs.map(() => ({ succeeded: true })) };
    });
    await IndexDocuments(["doc content 1", "doc content 2"], "test.txt", "t1");
    uploadedDocs.forEach((doc: any) => {
      expect(doc.user).toBe(hashedEmail);
    });
  });
});

describe("chat-page.unit.search.005 — IndexDocuments returns per-doc ERROR when upload fails", () => {
  it("returns ERROR for failed upload", async () => {
    mockUpload.mockResolvedValueOnce({
      results: [{ succeeded: false, errorMessage: "upload failed" }],
    });
    const results = await IndexDocuments(["content"]);
    expect(results[0].status).toBe("ERROR");
    expect((results[0] as any).errors[0].message).toContain("upload failed");
  });
});

describe("chat-page.unit.search.006 — DeleteDocumentsOfChatThread issues search filter scoped by chatThreadId", () => {
  it("calls SimpleSearch with chatThreadId filter", async () => {
    let capturedFilter: string | undefined;
    // SimpleSearch calls instance.search(text, { filter })
    mockSearch.mockImplementationOnce(async (_text: any, opts: any) => {
      capturedFilter = opts?.filter;
      return { results: makeSearchResultsGen([]) };
    });
    await DeleteDocumentsOfChatThread("t1");
    expect(typeof capturedFilter).toBe("string");
    expect(capturedFilter!).toContain("t1");
  });
});

describe("chat-page.unit.search.007 — DeleteSearchDocumentByPersonaDocumentId filter includes hashed user", () => {
  it("includes hashed user in filter", async () => {
    let capturedFilter: string | undefined;
    mockSearch.mockImplementationOnce(async (_text: any, opts: any) => {
      capturedFilter = opts?.filter;
      return { results: makeSearchResultsGen([]) };
    });
    await DeleteSearchDocumentByPersonaDocumentId("persona-doc-1");
    expect(typeof capturedFilter).toBe("string");
    expect(capturedFilter!).toContain(hashedEmail);
  });
});

describe("chat-page.unit.search.008 — EnsureIndexIsCreated returns existing index when getIndex resolves", () => {
  it("returns OK with existing index, createIndex not called", async () => {
    mockGetIndex.mockResolvedValueOnce({ name: "existing-index" });
    const result = await EnsureIndexIsCreated();
    expect(result.status).toBe("OK");
    expect((result as any).response.name).toBe("existing-index");
    expect(mockCreateIndex).not.toHaveBeenCalled();
  });
});

describe("chat-page.unit.search.009 — EnsureIndexIsCreated falls through to creation when getIndex throws", () => {
  it("creates index when getIndex throws", async () => {
    mockGetIndex.mockRejectedValueOnce(new Error("not found"));
    mockCreateIndex.mockResolvedValueOnce({ name: "new-index" });
    const result = await EnsureIndexIsCreated();
    expect(result.status).toBe("OK");
    expect((result as any).response.name).toBe("new-index");
  });
});
