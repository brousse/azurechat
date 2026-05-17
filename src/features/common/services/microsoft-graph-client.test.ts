import { describe, it, expect, vi } from "vitest";

// Hoist graph client mock
const { MockClient, mockInit } = vi.hoisted(() => {
  const mockInit = vi.fn((options: any) => {
    // Simulate the authProvider callback being callable
    const client = { _type: "GraphClient", _options: options };
    return client;
  });
  const MockClient = { init: mockInit };
  return { MockClient, mockInit };
});

vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: MockClient,
}));

describe("common.unit.microsoft-graph-client — getGraphClient", () => {
  it("common.unit.graph.001: calls Client.init with an authProvider", async () => {
    const { getGraphClient } = await import("./microsoft-graph-client");
    getGraphClient("my-access-token");
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ authProvider: expect.any(Function) })
    );
  });

  it("common.unit.graph.002: authProvider done callback receives the access token", async () => {
    const { getGraphClient } = await import("./microsoft-graph-client");
    getGraphClient("test-token-123");
    const { authProvider } = mockInit.mock.calls[0][0];
    const done = vi.fn();
    authProvider(done);
    expect(done).toHaveBeenCalledWith(null, "test-token-123");
  });

  it("common.unit.graph.003: returns the client from Client.init", async () => {
    const { getGraphClient } = await import("./microsoft-graph-client");
    const client = getGraphClient("tok");
    expect(client).toBeDefined();
    expect(client).toHaveProperty("_type", "GraphClient");
  });

  it("common.unit.graph.004: each call creates a new client instance", async () => {
    const { getGraphClient } = await import("./microsoft-graph-client");
    getGraphClient("tok-a");
    getGraphClient("tok-b");
    expect(mockInit).toHaveBeenCalledTimes(2);
  });
});
