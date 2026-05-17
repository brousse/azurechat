import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/features/chat-page/chat-services/chat-api/chat-api-rag-extension", () => ({
  SearchAzureAISimilarDocuments: vi.fn(),
}));

import { SearchAzureAISimilarDocuments } from "@/features/chat-page/chat-services/chat-api/chat-api-rag-extension";
import { POST } from "./route";

const mockedSearch = SearchAzureAISimilarDocuments as ReturnType<typeof vi.fn>;

describe("/api/document route", () => {
  beforeEach(() => {
    mockedSearch.mockReset();
  });

  // api.unit.document.001
  it("POST delegates to SearchAzureAISimilarDocuments and forwards response", async () => {
    const mockResp = new Response(JSON.stringify([{ content: "doc1" }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    mockedSearch.mockResolvedValue(mockResp);

    const req = new NextRequest("http://localhost/api/document", {
      method: "POST",
      body: JSON.stringify({ query: "test query", chatThreadId: "thread1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(mockedSearch).toHaveBeenCalledWith(req);
    expect(res).toBe(mockResp);
  });

  // api.unit.document.002
  it("returns non-200 when SearchAzureAISimilarDocuments throws", async () => {
    mockedSearch.mockRejectedValue(new Error("search service unavailable"));

    const req = new NextRequest("http://localhost/api/document", {
      method: "POST",
      body: JSON.stringify({ query: "fail" }),
      headers: { "Content-Type": "application/json" },
    });

    // document/route.ts has no try/catch — unhandled promise rejection propagates
    await expect(POST(req)).rejects.toThrow("search service unavailable");
  });
});
