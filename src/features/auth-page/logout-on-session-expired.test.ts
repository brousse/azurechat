import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth/react signOut
const mockSignOut = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: mockSignOut,
}));

describe("auth-page.unit.logoutOnSessionExpired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auth-page.unit.logout.001: returns false for non-UNAUTHORIZED status", async () => {
    const { logoutOnSessionExpired } = await import("./logout-on-session-expired");
    const result = logoutOnSessionExpired({ status: "OK", response: null });
    expect(result).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("auth-page.unit.logout.002: returns false for UNAUTHORIZED without errors", async () => {
    const { logoutOnSessionExpired } = await import("./logout-on-session-expired");
    const result = logoutOnSessionExpired({ status: "UNAUTHORIZED", errors: [] });
    expect(result).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("auth-page.unit.logout.003: returns false for UNAUTHORIZED with non-session-expired error code", async () => {
    const { logoutOnSessionExpired } = await import("./logout-on-session-expired");
    const result = logoutOnSessionExpired({
      status: "UNAUTHORIZED",
      errors: [{ message: "Forbidden", code: "FORBIDDEN" }],
    });
    expect(result).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("auth-page.unit.logout.004: calls signOut and returns true for SESSION_EXPIRED error", async () => {
    const { logoutOnSessionExpired } = await import("./logout-on-session-expired");
    const result = logoutOnSessionExpired({
      status: "UNAUTHORIZED",
      errors: [{ message: "Session expired", code: "SESSION_EXPIRED" }],
    });
    expect(result).toBe(true);
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("auth-page.unit.logout.005: handles errors array with multiple entries, only SESSION_EXPIRED triggers signOut", async () => {
    const { logoutOnSessionExpired } = await import("./logout-on-session-expired");
    const result = logoutOnSessionExpired({
      status: "UNAUTHORIZED",
      errors: [
        { message: "Other error", code: "OTHER" },
        { message: "Session expired", code: "SESSION_EXPIRED" },
      ],
    });
    expect(result).toBe(true);
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("auth-page.unit.logout.006: returns false for ERROR status (not UNAUTHORIZED)", async () => {
    const { logoutOnSessionExpired } = await import("./logout-on-session-expired");
    const result = logoutOnSessionExpired({
      status: "ERROR",
      errors: [{ message: "Session expired", code: "SESSION_EXPIRED" }],
    });
    expect(result).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
