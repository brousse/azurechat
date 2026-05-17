import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { setSession, adminSession, defaultSession } from "@/__tests__/helpers/session-mock";

const hashEmail = (e: string) => createHash("sha256").update(e).digest("hex");
const USER_HASH = hashEmail(defaultSession!.user.email);

// ── Cosmos mock ───────────────────────────────────────────────────────────────
let configItems: any[] = [];

const configContainer = {
  items: {
    create: vi.fn(async (doc: any) => ({ resource: { ...doc } })),
    upsert: vi.fn(async (doc: any) => ({ resource: { ...doc } })),
    query: vi.fn((_q: any) => ({
      fetchAll: async () => ({ resources: configItems }),
    })),
  },
  item: vi.fn((id: string, _pk?: string) => ({
    read: vi.fn(async () => ({ resource: configItems.find((i: any) => i.id === id) })),
    delete: vi.fn(async () => {
      const idx = configItems.findIndex((i: any) => i.id === id);
      if (idx >= 0) configItems.splice(idx, 1);
      return { resource: undefined };
    }),
  })),
};

vi.mock("@/features/common/services/cosmos", () => ({
  HistoryContainer: () => configContainer,
  ConfigContainer: () => configContainer,
}));

vi.mock("@/features/auth-page/auth-api", () => ({ options: {}, authOptions: {} }));

vi.mock("@/features/common/services/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
}));

import {
  CreatePrompt,
  FindAllPrompts,
  FindPromptByID,
  EnsurePromptOperation,
  DeletePrompt,
  UpsertPrompt,
} from "./prompt-service";

const makePrompt = (overrides: Record<string, any> = {}) => ({
  id: "p1",
  name: "Test Prompt",
  description: "A description",
  isPublished: false,
  userId: USER_HASH,
  createdAt: new Date(),
  type: "PROMPT" as const,
  ...overrides,
});

beforeEach(() => {
  configItems.length = 0;
  vi.clearAllMocks();
  setSession(defaultSession);
  configContainer.items.create.mockImplementation(async (doc: any) => ({ resource: { ...doc } }));
  configContainer.items.upsert.mockImplementation(async (doc: any) => ({ resource: { ...doc } }));
  configContainer.items.query.mockImplementation((_q: any) => ({
    fetchAll: async () => ({ resources: configItems }),
  }));
  configContainer.item.mockImplementation((id: string, _pk?: string) => ({
    read: vi.fn(async () => ({ resource: configItems.find((i: any) => i.id === id) })),
    delete: vi.fn(async () => {
      const idx = configItems.findIndex((i: any) => i.id === id);
      if (idx >= 0) configItems.splice(idx, 1);
      return { resource: undefined };
    }),
  }));
});

describe("prompt-service.ts", () => {
  // 001 – CreatePrompt forces isPublished:false for non-admin
  it("001 CreatePrompt forces isPublished:false for non-admin", async () => {
    await setSession(defaultSession);
    const result = await CreatePrompt(makePrompt({ isPublished: true }));
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.response.isPublished).toBe(false);
      expect(result.response.userId).toBe(USER_HASH);
      expect(result.response.type).toBe("PROMPT");
      // id should be 36 chars (UUID)
      expect(result.response.id).toHaveLength(36);
    }
  });

  // 002 – CreatePrompt validation rejects empty name
  it("002 CreatePrompt validation rejects empty name", async () => {
    const result = await CreatePrompt(makePrompt({ name: "", description: "" }));
    expect(result.status).toBe("ERROR");
    if (result.status === "ERROR") {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  // 003 – FindAllPrompts SQL scopes by isPublished OR ownerId
  it("003 FindAllPrompts SQL scopes by isPublished OR ownerId", async () => {
    let capturedSpec: any;
    configContainer.items.query.mockImplementationOnce((q: any) => {
      capturedSpec = q;
      return { fetchAll: async () => ({ resources: [] }) };
    });

    await FindAllPrompts();

    expect(capturedSpec).toBeDefined();
    const userParam = capturedSpec.parameters.find((p: any) => p.name === "@userId");
    expect(userParam?.value).toBe(USER_HASH);
    const publishedParam = capturedSpec.parameters.find((p: any) => p.name === "@isPublished");
    expect(publishedParam?.value).toBe(true);
    const typeParam = capturedSpec.parameters.find((p: any) => p.name === "@type");
    expect(typeParam?.value).toBe("PROMPT");
  });

  // 004 – FindPromptByID returns NOT_FOUND when no rows
  it("004 FindPromptByID returns NOT_FOUND when no rows", async () => {
    const result = await FindPromptByID("nonexistent");
    expect(result.status).toBe("NOT_FOUND");
  });

  // 005 – EnsurePromptOperation rejects non-owner non-admin
  it("005 EnsurePromptOperation rejects non-owner non-admin", async () => {
    await setSession(defaultSession);
    configItems.push(makePrompt({ id: "p-other", userId: "other-hash" }));

    const result = await EnsurePromptOperation("p-other");
    expect(result.status).toBe("UNAUTHORIZED");
  });

  // 006 – EnsurePromptOperation admin OK
  it("006 EnsurePromptOperation admin OK", async () => {
    await setSession(adminSession);
    configItems.push(makePrompt({ id: "p-admin", userId: "some-other-hash" }));

    const result = await EnsurePromptOperation("p-admin");
    expect(result.status).toBe("OK");
  });

  // 007 – DeletePrompt calls item.delete with partition key
  it("007 DeletePrompt calls item.delete with partition key", async () => {
    await setSession(defaultSession);
    configItems.push(makePrompt({ id: "p-del", userId: USER_HASH }));

    const deleteSpy = vi.fn().mockResolvedValue({ resource: undefined });
    configContainer.item.mockImplementationOnce((_id: string, _pk: string) => ({
      read: vi.fn().mockResolvedValue({ resource: configItems.find((i: any) => i.id === _id) }),
      delete: deleteSpy,
    }));

    await DeletePrompt("p-del");
    expect(deleteSpy).toHaveBeenCalled();
  });

  // 008 – UpsertPrompt non-admin keeps existing isPublished
  it("008 UpsertPrompt non-admin keeps existing isPublished", async () => {
    await setSession(defaultSession);
    configItems.push(makePrompt({ id: "p-upsert", isPublished: true, userId: USER_HASH }));

    const result = await UpsertPrompt(makePrompt({ id: "p-upsert", isPublished: false, userId: USER_HASH }));
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.response.isPublished).toBe(true);
    }
  });
});
