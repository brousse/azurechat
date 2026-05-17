import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/chat-page/chat-services/models", () => ({
  MODEL_CONFIGS: {
    "gpt-a": {
      id: "gpt-a",
      name: "GPT A",
      description: "model a",
      deploymentName: "deploy-a",
      defaultReasoningEffort: "low",
      pricing: { inputPerMillion: 1, outputPerMillion: 2, cachedInputPerMillion: 0.5 },
      contextWindow: 128000,
      supportsReasoning: false,
      supportsResponsesAPI: false,
      getInstance: vi.fn(),
    },
    "gpt-b": {
      id: "gpt-b",
      name: "GPT B",
      description: "model b",
      deploymentName: "",
      defaultReasoningEffort: "medium",
      pricing: { inputPerMillion: 1, outputPerMillion: 2, cachedInputPerMillion: 0.5 },
      contextWindow: 128000,
      supportsReasoning: false,
      supportsResponsesAPI: false,
      getInstance: vi.fn(),
    },
    "gpt-c": {
      id: "gpt-c",
      name: "GPT C",
      description: "model c",
      deploymentName: undefined,
      defaultReasoningEffort: "high",
      pricing: { inputPerMillion: 1, outputPerMillion: 2, cachedInputPerMillion: 0.5 },
      contextWindow: 128000,
      supportsReasoning: false,
      supportsResponsesAPI: false,
      getInstance: vi.fn(),
    },
  },
  DEFAULT_MODEL: "gpt-a",
}));

vi.mock("@/features/common/services/logger", () => ({
  logError: vi.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest() {
  return new NextRequest("http://localhost/api/models");
}

describe("/api/models route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // api.unit.models.001 — only env-configured models are returned
  it("returns only models whose deploymentName is set and non-empty", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    // gpt-a has deploymentName set; gpt-b is empty string; gpt-c is undefined
    expect(Object.keys(body.availableModels)).toEqual(["gpt-a"]);
    expect(body.availableModelIds).toEqual(["gpt-a"]);
    expect(body.defaultModel).toBe("gpt-a");
    expect(body.defaultReasoningEffort).toBe("low");
  });

  // api.unit.models.002 — all models filtered out → defaultModel falls back to DEFAULT_MODEL
  it("falls back to DEFAULT_MODEL when no deployments are configured", async () => {
    const { MODEL_CONFIGS } = await import("@/features/chat-page/chat-services/models");
    const original = { ...MODEL_CONFIGS };
    // Temporarily blank out deploymentName for gpt-a
    (MODEL_CONFIGS as any)["gpt-a"].deploymentName = "";

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.availableModelIds).toHaveLength(0);
    expect(body.defaultModel).toBe("gpt-a"); // DEFAULT_MODEL

    // Restore
    (MODEL_CONFIGS as any)["gpt-a"].deploymentName = "deploy-a";
  });

  // api.unit.models.003 — downstream throw (Error instance) → 500
  it("returns 500 when MODEL_CONFIGS iteration throws an Error", async () => {
    const mod = await import("@/features/chat-page/chat-services/models");
    const orig = mod.MODEL_CONFIGS;
    Object.defineProperty(mod, "MODEL_CONFIGS", {
      get() { throw new Error("configs unavailable"); },
      configurable: true,
    });

    try {
      const res = await GET(makeRequest());
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toMatch(/Failed to get available models/);
    } finally {
      Object.defineProperty(mod, "MODEL_CONFIGS", {
        value: orig,
        writable: true,
        configurable: true,
      });
    }
  });

  // api.unit.models.004 — downstream throw (non-Error) → covers String(error) branch
  it("returns 500 when MODEL_CONFIGS iteration throws a string", async () => {
    const mod = await import("@/features/chat-page/chat-services/models");
    const orig = mod.MODEL_CONFIGS;
    Object.defineProperty(mod, "MODEL_CONFIGS", {
      get() { throw "string error"; },
      configurable: true,
    });

    try {
      const res = await GET(makeRequest());
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toMatch(/Failed to get available models/);
    } finally {
      Object.defineProperty(mod, "MODEL_CONFIGS", {
        value: orig,
        writable: true,
        configurable: true,
      });
    }
  });

  // api.unit.models.005 — defaultReasoningEffort || "low" fallback (undefined effort)
  it("defaultReasoningEffort falls back to 'low' when undefined", async () => {
    const mod = await import("@/features/chat-page/chat-services/models");
    const orig = mod.MODEL_CONFIGS;
    // Temporarily make gpt-a have undefined defaultReasoningEffort
    (mod.MODEL_CONFIGS as any)["gpt-a"].defaultReasoningEffort = undefined;

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.defaultReasoningEffort).toBe("low");

    (mod.MODEL_CONFIGS as any)["gpt-a"].defaultReasoningEffort = "low";
  });
});
