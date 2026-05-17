import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/chat-page/chat-services/chat-api/chat-api", () => ({
  ChatAPIEntry: vi.fn(),
}));

vi.mock("@/features/common/services/logger", () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

import { ChatAPIEntry } from "@/features/chat-page/chat-services/chat-api/chat-api";
import { POST } from "./route";

const mockedChatAPIEntry = ChatAPIEntry as ReturnType<typeof vi.fn>;

/** Build a mock Request whose formData() resolves with the provided fields. */
function makeMockRequest(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return {
    formData: vi.fn().mockResolvedValue(fd),
    signal: new AbortController().signal,
  } as unknown as Request;
}

/** Build a mock Request whose formData() resolves with empty FormData. */
function makeEmptyRequest() {
  const fd = new FormData();
  return {
    formData: vi.fn().mockResolvedValue(fd),
    signal: new AbortController().signal,
  } as unknown as Request;
}

/** Build a mock Request whose formData() throws. */
function makeThrowingRequest(err: Error) {
  return {
    formData: vi.fn().mockRejectedValue(err),
    signal: new AbortController().signal,
  } as unknown as Request;
}

describe("/api/chat route", () => {
  beforeEach(() => {
    mockedChatAPIEntry.mockReset();
  });

  // api.unit.chat.001
  it("POST parses FormData and calls ChatAPIEntry with parsed UserPrompt + signal", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    mockedChatAPIEntry.mockResolvedValue(mockResponse);

    const req = makeMockRequest({
      content: JSON.stringify({ message: "hi", id: "t1" }),
      "image-base64": "",
    });
    const res = await POST(req);

    expect(mockedChatAPIEntry).toHaveBeenCalledWith(
      expect.objectContaining({ message: "hi", id: "t1", multimodalImage: "" }),
      expect.any(Object)
    );
    expect(res).toBe(mockResponse);
  });

  // api.unit.chat.002
  it("POST returns 500 on JSON parse failure", async () => {
    const req = makeMockRequest({ content: "not-valid-json", "image-base64": "" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toMatch(/Internal Server Error/i);
  });

  // api.unit.chat.003
  it("POST passes through image-base64 as multimodalImage", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    mockedChatAPIEntry.mockResolvedValue(mockResponse);

    const imageData = "data:image/png;base64,XYZ";
    const req = makeMockRequest({
      content: JSON.stringify({ message: "with image", id: "t2" }),
      "image-base64": imageData,
    });
    await POST(req);

    expect(mockedChatAPIEntry).toHaveBeenCalledWith(
      expect.objectContaining({ multimodalImage: imageData }),
      expect.any(Object)
    );
  });

  // api.unit.chat.004
  it("Returns 500 when ChatAPIEntry throws synchronously", async () => {
    mockedChatAPIEntry.mockRejectedValue(new Error("upstream failure"));

    const req = makeMockRequest({
      content: JSON.stringify({ message: "hi", id: "t3" }),
      "image-base64": "",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  // api.unit.chat.005
  // content field missing → formData.get("content") returns null → JSON.parse(null) = null
  // → spread of null is fine → ChatAPIEntry called with { multimodalImage: "" }
  // ChatAPIEntry mock not set → returns undefined → route returns undefined → observable shape.
  // Make ChatAPIEntry throw so the outer catch returns 500.
  it("Returns 500 when FormData missing content field and ChatAPIEntry throws", async () => {
    mockedChatAPIEntry.mockRejectedValue(new Error("bad prompt"));
    const req = makeEmptyRequest();
    const res = await POST(req);
    expect([400, 500]).toContain(res.status);
  });
});
