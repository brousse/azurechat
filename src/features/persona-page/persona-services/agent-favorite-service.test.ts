import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { setSession, defaultSession } from "@/__tests__/helpers/session-mock";

const hashEmail = (e: string) => createHash("sha256").update(e).digest("hex");
const USER_HASH = hashEmail(defaultSession!.user.email);

// ── Cosmos mock ───────────────────────────────────────────────────────────────
let historyItems: any[] = [];

const historyContainer = {
  items: {
    upsert: vi.fn(async (doc: any) => ({ resource: { ...doc }, item: { id: doc.id } })),
    query: vi.fn((_q: any) => ({
      fetchAll: async () => ({ resources: historyItems }),
    })),
  },
  item: vi.fn((id: string, _pk?: string) => ({
    read: vi.fn(async () => ({ resource: historyItems.find((i: any) => i.id === id) })),
    delete: vi.fn(async () => {
      const idx = historyItems.findIndex((i: any) => i.id === id);
      if (idx >= 0) historyItems.splice(idx, 1);
      return { resource: undefined };
    }),
  })),
};

vi.mock("@/features/common/services/cosmos", () => ({
  HistoryContainer: () => historyContainer,
  ConfigContainer: () => historyContainer,
}));

vi.mock("@/features/auth-page/auth-api", () => ({ options: {}, authOptions: {} }));

vi.mock("@/features/common/services/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
}));

import { GetUserFavoriteAgents, ToggleFavoriteAgent } from "./agent-favorite-service";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  historyItems.length = 0;
  vi.clearAllMocks();
  setSession(defaultSession);
  historyContainer.items.upsert.mockImplementation(async (doc: any) => ({
    resource: { ...doc },
    item: { id: doc.id },
  }));
  historyContainer.item.mockImplementation((id: string, _pk?: string) => ({
    read: vi.fn(async () => ({ resource: historyItems.find((i: any) => i.id === id) })),
    delete: vi.fn(async () => {
      const idx = historyItems.findIndex((i: any) => i.id === id);
      if (idx >= 0) historyItems.splice(idx, 1);
      return { resource: undefined };
    }),
  }));
});

describe("agent-favorite-service.ts", () => {
  // 001 – GetUserFavoriteAgents returns existing agentIds
  it("001 GetUserFavoriteAgents returns existing agentIds", async () => {
    const docId = `AGENT_FAVORITE_${USER_HASH}`;
    historyItems.push({
      id: docId,
      userId: USER_HASH,
      type: "AGENT_FAVORITE",
      agentIds: ["a", "b"],
    });

    const result = await GetUserFavoriteAgents();
    expect(result).toEqual(["a", "b"]);
  });

  // 002 – GetUserFavoriteAgents returns [] when read throws
  it("002 GetUserFavoriteAgents returns [] when read throws", async () => {
    historyContainer.item.mockImplementationOnce(() => ({
      read: vi.fn().mockRejectedValue(new Error("Not found")),
      delete: vi.fn(),
    }));

    const result = await GetUserFavoriteAgents();
    expect(result).toEqual([]);
  });

  // 003 – ToggleFavoriteAgent adds new id to empty list
  it("003 ToggleFavoriteAgent adds new id to empty list", async () => {
    const result = await ToggleFavoriteAgent("a1");
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.response).toContain("a1");
    }

    const upsertArg = historyContainer.items.upsert.mock.calls[0][0];
    expect(upsertArg.agentIds).toContain("a1");

    // revalidatePath called for persona and agent
    expect(revalidatePath).toHaveBeenCalledWith("/persona", undefined);
    expect(revalidatePath).toHaveBeenCalledWith("/agent", undefined);
  });

  // 004 – ToggleFavoriteAgent removes existing id
  it("004 ToggleFavoriteAgent removes existing id", async () => {
    const docId = `AGENT_FAVORITE_${USER_HASH}`;
    historyItems.push({
      id: docId,
      userId: USER_HASH,
      type: "AGENT_FAVORITE",
      agentIds: ["a1", "a2"],
    });

    const result = await ToggleFavoriteAgent("a1");
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.response).toEqual(["a2"]);
      expect(result.response).not.toContain("a1");
    }
  });

  // 005 – ToggleFavoriteAgent uses doc id AGENT_FAVORITE_<userHash>
  it("005 ToggleFavoriteAgent uses doc id AGENT_FAVORITE_<userHash>", async () => {
    const expectedDocId = `AGENT_FAVORITE_${USER_HASH}`;
    await ToggleFavoriteAgent("x");

    const upsertArg = historyContainer.items.upsert.mock.calls[0][0];
    expect(upsertArg.id).toBe(expectedDocId);
    expect(upsertArg.userId).toBe(USER_HASH);
  });
});
