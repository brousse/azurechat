import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Hoist graph client mock
const { mockGet, mockResponseType, mockApi } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockResponseType = vi.fn();
  const mockApi = vi.fn();

  mockResponseType.mockReturnValue({ get: mockGet });
  mockApi.mockReturnValue({ responseType: mockResponseType });

  return { mockGet, mockResponseType, mockApi };
});

vi.mock("../services/microsoft-graph-client", () => ({
  getGraphClient: vi.fn(() => ({
    api: mockApi,
  })),
}));

vi.mock("@microsoft/microsoft-graph-client", () => ({
  ResponseType: { ARRAYBUFFER: "arraybuffer" },
}));

describe("common.unit.useProfilePicture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("common.unit.useProfilePicture.001: returns empty string initially (no token)", async () => {
    const { useProfilePicture } = await import("./useProfilePicture");
    const { result } = renderHook(() => useProfilePicture(undefined));
    expect(result.current).toBe("");
  });

  it("common.unit.useProfilePicture.002: returns empty string when token is undefined (stays empty)", async () => {
    const { useProfilePicture } = await import("./useProfilePicture");
    const { result } = renderHook(() => useProfilePicture(undefined));
    // No fetch should happen without token
    await waitFor(() => {
      expect(mockApi).not.toHaveBeenCalled();
    });
    expect(result.current).toBe("");
  });

  it("common.unit.useProfilePicture.003: fetches profile picture when token is provided", async () => {
    // Return a simple buffer
    const fakeBuffer = new Uint8Array([104, 105]).buffer; // "hi"
    mockGet.mockResolvedValue(fakeBuffer);

    const { useProfilePicture } = await import("./useProfilePicture");
    const { result } = renderHook(() => useProfilePicture("valid-token"));

    await waitFor(() => {
      expect(result.current).not.toBe("");
    });

    expect(result.current).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("common.unit.useProfilePicture.004: returns empty string when graph API throws", async () => {
    mockGet.mockRejectedValue(new Error("403 Forbidden"));

    const { useProfilePicture } = await import("./useProfilePicture");
    const { result } = renderHook(() => useProfilePicture("token-with-no-photo"));

    await waitFor(() => {
      // Should have attempted the fetch
      expect(mockGet).toHaveBeenCalled();
    });

    // Error is swallowed, state stays ""
    expect(result.current).toBe("");
  });
});
