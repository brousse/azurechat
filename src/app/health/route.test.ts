import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("api.unit.health.001 — GET /health returns 200 {status:'ok'}", () => {
  it("returns 200 with {status:'ok'}", async () => {
    const req = new NextRequest("http://localhost/health");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
