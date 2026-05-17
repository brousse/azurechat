import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

// helpers.ts imports `options` from auth-api which triggers NextAuth; mock it.
vi.mock("@/features/auth-page/auth-api", () => ({ options: {} }));

// Lazy import helpers after mocks are set up
async function importHelpers() {
  return await import("./helpers");
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

describe("auth-page.unit.helpers — hashValue", () => {
  it("auth-page.unit.helpers.001: is deterministic SHA-256 hex", async () => {
    const { hashValue } = await importHelpers();
    const expected = sha256("test@example.com");
    expect(hashValue("test@example.com")).toBe(expected);
    expect(hashValue("test@example.com")).toBe(expected);
    expect(expected).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(expected)).toBe(true);
  });

  it("auth-page.unit.helpers.002: whitespace is significant (no trimming)", async () => {
    const { hashValue } = await importHelpers();
    expect(hashValue("a@b.com")).not.toBe(hashValue(" a@b.com"));
  });
});

describe("auth-page.unit.helpers — userSession", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("auth-page.unit.helpers.003: returns mapped UserModel for valid session", async () => {
    // Default mock from setup.ts already provides test@example.com non-admin session
    const { userSession } = await importHelpers();
    const result = await userSession();
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      name: "Test User",
      email: "test@example.com",
      isAdmin: false,
      token: "test-access-token",
    });
  });

  it("auth-page.unit.helpers.004: returns null when getServerSession returns null", async () => {
    const nextAuth = await import("next-auth");
    (nextAuth as any).getServerSession.mockResolvedValueOnce(null);
    const { userSession } = await importHelpers();
    const result = await userSession();
    expect(result).toBeNull();
  });

  it("auth-page.unit.helpers.005: returns null when session has no .user", async () => {
    const nextAuth = await import("next-auth");
    (nextAuth as any).getServerSession.mockResolvedValueOnce({
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    const { userSession } = await importHelpers();
    const result = await userSession();
    expect(result).toBeNull();
  });
});

describe("auth-page.unit.helpers — getCurrentUser", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("auth-page.unit.helpers.006: throws when no session", async () => {
    const nextAuth = await import("next-auth");
    (nextAuth as any).getServerSession.mockResolvedValueOnce(null);
    const { getCurrentUser } = await importHelpers();
    await expect(getCurrentUser()).rejects.toThrow("User not found");
  });

  it("auth-page.unit.helpers.007: returns user when authenticated", async () => {
    const { getCurrentUser } = await importHelpers();
    const user = await getCurrentUser();
    expect(user.email).toBe("test@example.com");
    expect(user.isAdmin).toBe(false);
  });
});

describe("auth-page.unit.helpers — userHashedId", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("auth-page.unit.helpers.008: hashes the session email", async () => {
    const { userHashedId } = await importHelpers();
    const result = await userHashedId();
    expect(result).toBe(sha256("test@example.com"));
  });

  it("auth-page.unit.helpers.009: throws when no session", async () => {
    const nextAuth = await import("next-auth");
    (nextAuth as any).getServerSession.mockResolvedValueOnce(null);
    const { userHashedId } = await importHelpers();
    await expect(userHashedId()).rejects.toThrow("User not found");
  });
});

describe("auth-page.unit.helpers — redirectIfAuthenticated", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("auth-page.unit.helpers.010: redirects logged-in users to /chat (SOURCE BUG: missing await on RedirectToPage)", async () => {
    // NOTE: helpers.ts line 48 calls `RedirectToPage("chat")` without `await`.
    // The NEXT_REDIRECT error is therefore an unhandled rejection; the function itself resolves normally.
    // We attach an unhandledRejection handler to prevent Vitest from flagging it as a test error.
    const unhandledErrors: any[] = [];
    const handler = (reason: any) => unhandledErrors.push(reason);
    process.on("unhandledRejection", handler);

    try {
      const { redirectIfAuthenticated } = await importHelpers();
      // Function resolves because the thrown error is in an unawaited promise
      await expect(redirectIfAuthenticated()).resolves.toBeUndefined();
      // Give the event loop a tick for the unhandled rejection to fire
      await new Promise((r) => setTimeout(r, 0));
      // Confirm the redirect was triggered (observable side-effect)
      const nav = await import("next/navigation");
      expect((nav as any).redirect).toHaveBeenCalledWith("/chat");
    } finally {
      process.off("unhandledRejection", handler);
    }
  });

  it("auth-page.unit.helpers.011: is a no-op for anonymous users", async () => {
    const nextAuth = await import("next-auth");
    (nextAuth as any).getServerSession.mockResolvedValueOnce(null);
    const { redirectIfAuthenticated } = await importHelpers();
    // Should resolve without throwing
    await expect(redirectIfAuthenticated()).resolves.toBeUndefined();
    const nav = await import("next/navigation");
    expect((nav as any).redirect).not.toHaveBeenCalled();
  });
});
