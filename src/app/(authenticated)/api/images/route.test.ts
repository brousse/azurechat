import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/features/chat-page/chat-services/images-api", () => ({
  ImageAPIEntry: vi.fn(),
}));

import { ImageAPIEntry } from "@/features/chat-page/chat-services/images-api";
import { GET } from "./route";

const mockedImageAPIEntry = ImageAPIEntry as ReturnType<typeof vi.fn>;

describe("/api/images route", () => {
  beforeEach(() => {
    mockedImageAPIEntry.mockReset();
  });

  // api.unit.images.001
  it("GET delegates to ImageAPIEntry and forwards response", async () => {
    const mockResp = new Response("image-bytes", {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
    mockedImageAPIEntry.mockResolvedValue(mockResp);

    const req = new NextRequest("http://localhost/api/images?t=tid&img=a.png");
    const res = await GET(req);

    expect(mockedImageAPIEntry).toHaveBeenCalledWith(req);
    expect(res).toBe(mockResp);
  });

  // api.unit.images.003
  it("returns 404 when ImageAPIEntry returns 404", async () => {
    const mockResp = new Response("Not Found", { status: 404 });
    mockedImageAPIEntry.mockResolvedValue(mockResp);

    const req = new NextRequest("http://localhost/api/images?t=tid&img=missing.png");
    const res = await GET(req);

    expect(res.status).toBe(404);
  });
});
