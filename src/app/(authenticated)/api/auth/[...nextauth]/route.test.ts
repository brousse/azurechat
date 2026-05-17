/**
 * Smoke test: verifies that the [...nextauth] route module re-exports GET and POST
 * handlers sourced from the auth-api handlers object. No HTTP call is made.
 */
import { describe, it, expect, vi } from "vitest";

// The route re-exports `handlers as GET, handlers as POST` from auth-api.
// We mock auth-api so NextAuth itself is never initialised during unit tests.
vi.mock("@/features/auth-page/auth-api", () => {
  const handlers = vi.fn() as unknown as { GET: unknown; POST: unknown };
  return { handlers };
});

describe("/api/auth/[...nextauth] route (re-export smoke test)", () => {
  // api.unit.nextauth.001 — GET is exported
  it("exports a GET handler", async () => {
    const { GET } = await import("./route");
    expect(GET).toBeDefined();
  });

  // api.unit.nextauth.002 — POST is exported
  it("exports a POST handler", async () => {
    const { POST } = await import("./route");
    expect(POST).toBeDefined();
  });

  // api.unit.nextauth.003 — GET and POST are the same handlers object (both aliased to `handlers`)
  it("GET and POST are the same handlers reference", async () => {
    const { GET, POST } = await import("./route");
    expect(GET).toBe(POST);
  });
});
