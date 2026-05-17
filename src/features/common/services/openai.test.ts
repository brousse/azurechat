import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist AzureOpenAI mock
const { MockAzureOpenAI } = vi.hoisted(() => {
  const MockAzureOpenAI = vi.fn().mockImplementation((opts) => ({
    _type: "AzureOpenAI",
    _opts: opts,
  }));
  return { MockAzureOpenAI };
});

vi.mock("openai", () => ({
  AzureOpenAI: MockAzureOpenAI,
}));

vi.mock("./azure-default-credential", () => ({
  getAzureCognitiveServicesTokenProvider: vi.fn(() => async () => "token"),
}));

describe("common.unit.openai — OpenAIInstance", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear the service-container globals so openai.ts re-registers its
    // production factories on the next import and MockAzureOpenAI gets
    // re-invoked instead of returning a cached singleton.
    const { reset } = await import("./service-container");
    reset();
    MockAzureOpenAI.mockClear();
  });

  it("common.unit.openai.001: creates AzureOpenAI with correct baseURL (api-key path)", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "my-instance");
    vi.stubEnv("AZURE_OPENAI_API_DEPLOYMENT_NAME", "gpt-4-dep");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "2024-10-21");
    const { OpenAIInstance } = await import("./openai");
    OpenAIInstance();
    expect(MockAzureOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://my-instance.openai.azure.com/openai/deployments/gpt-4-dep",
        apiVersion: "2024-10-21",
      })
    );
  });

  it("common.unit.openai.002: throws when required env vars missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "");
    vi.stubEnv("AZURE_OPENAI_API_DEPLOYMENT_NAME", "");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "");
    const { OpenAIInstance } = await import("./openai");
    expect(() => OpenAIInstance()).toThrow(
      "Azure OpenAI Chat endpoint config is not set"
    );
  });

  it("common.unit.openai.003: uses azureADTokenProvider when no API key set", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "");
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "my-instance");
    vi.stubEnv("AZURE_OPENAI_API_DEPLOYMENT_NAME", "gpt-4-dep");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "2024-10-21");
    const { OpenAIInstance } = await import("./openai");
    OpenAIInstance();
    const opts = MockAzureOpenAI.mock.calls[0][0];
    expect(opts.azureADTokenProvider).toBeDefined();
    expect(opts.apiKey).toBeUndefined();
  });
});

describe("common.unit.openai — OpenAIV1Instance", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear the service-container globals so openai.ts re-registers its
    // production factories on the next import and MockAzureOpenAI gets
    // re-invoked instead of returning a cached singleton.
    const { reset } = await import("./service-container");
    reset();
    MockAzureOpenAI.mockClear();
  });

  it("common.unit.openai.004: creates v1 instance with /openai/v1/ baseURL", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "my-instance");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "2024-10-21");
    const { OpenAIV1Instance } = await import("./openai");
    OpenAIV1Instance();
    const opts = MockAzureOpenAI.mock.calls[0][0];
    expect(opts.baseURL).toContain("/openai/v1/");
    expect(opts.maxRetries).toBe(5);
  });

  it("common.unit.openai.005: throws when v1 env vars missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "");
    const { OpenAIV1Instance } = await import("./openai");
    expect(() => OpenAIV1Instance()).toThrow("Azure OpenAI v1 endpoint config is not set");
  });
});

describe("common.unit.openai — OpenAIMiniInstance", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear the service-container globals so openai.ts re-registers its
    // production factories on the next import and MockAzureOpenAI gets
    // re-invoked instead of returning a cached singleton.
    const { reset } = await import("./service-container");
    reset();
    MockAzureOpenAI.mockClear();
  });

  it("common.unit.openai.006: creates mini instance with deployment and fixed apiVersion", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "my-instance");
    vi.stubEnv("AZURE_OPENAI_API_MINI_DEPLOYMENT_NAME", "gpt-mini");
    const { OpenAIMiniInstance } = await import("./openai");
    OpenAIMiniInstance();
    const opts = MockAzureOpenAI.mock.calls[0][0];
    expect(opts.deployment).toBe("gpt-mini");
    expect(opts.apiVersion).toBe("2025-01-01-preview");
  });

  it("common.unit.openai.007: throws when mini env vars missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "");
    vi.stubEnv("AZURE_OPENAI_API_MINI_DEPLOYMENT_NAME", "");
    const { OpenAIMiniInstance } = await import("./openai");
    expect(() => OpenAIMiniInstance()).toThrow("Azure OpenAI Mini endpoint config is not set");
  });
});

describe("common.unit.openai — OpenAIEmbeddingInstance", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear the service-container globals so openai.ts re-registers its
    // production factories on the next import and MockAzureOpenAI gets
    // re-invoked instead of returning a cached singleton.
    const { reset } = await import("./service-container");
    reset();
    MockAzureOpenAI.mockClear();
  });

  it("common.unit.openai.008: creates embedding instance with correct deployment", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "my-instance");
    vi.stubEnv("AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME", "ada-002");
    const { OpenAIEmbeddingInstance } = await import("./openai");
    OpenAIEmbeddingInstance();
    const opts = MockAzureOpenAI.mock.calls[0][0];
    expect(opts.deployment).toBe("ada-002");
    expect(opts.apiVersion).toBe("2025-01-01-preview");
  });

  it("common.unit.openai.009: throws when embedding env vars missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "");
    vi.stubEnv("AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME", "");
    const { OpenAIEmbeddingInstance } = await import("./openai");
    expect(() => OpenAIEmbeddingInstance()).toThrow("Azure OpenAI Embeddings endpoint config is not set");
  });
});

describe("common.unit.openai — OpenAIVisionInstance", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear the service-container globals so openai.ts re-registers its
    // production factories on the next import and MockAzureOpenAI gets
    // re-invoked instead of returning a cached singleton.
    const { reset } = await import("./service-container");
    reset();
    MockAzureOpenAI.mockClear();
  });

  it("common.unit.openai.010: creates vision instance with custom api key env var", async () => {
    vi.stubEnv("AZURE_OPENAI_VISION_API_KEY", "vision-key");
    vi.stubEnv("AZURE_OPENAI_VISION_API_INSTANCE_NAME", "vision-instance");
    vi.stubEnv("AZURE_OPENAI_VISION_API_DEPLOYMENT_NAME", "gpt-4-vision");
    vi.stubEnv("AZURE_OPENAI_VISION_API_VERSION", "2024-02-01");
    const { OpenAIVisionInstance } = await import("./openai");
    OpenAIVisionInstance();
    const opts = MockAzureOpenAI.mock.calls[0][0];
    expect(opts.apiKey).toBe("vision-key");
    expect(opts.defaultHeaders).toEqual(expect.objectContaining({ "api-key": "vision-key" }));
    expect(opts.apiVersion).toBe("2024-02-01");
  });

  it("common.unit.openai.011: throws when vision env vars missing", async () => {
    vi.stubEnv("AZURE_OPENAI_VISION_API_DEPLOYMENT_NAME", "");
    vi.stubEnv("AZURE_OPENAI_VISION_API_INSTANCE_NAME", "");
    vi.stubEnv("AZURE_OPENAI_VISION_API_VERSION", "");
    const { OpenAIVisionInstance } = await import("./openai");
    expect(() => OpenAIVisionInstance()).toThrow("Azure OpenAI Vision environment config is not set");
  });
});

describe("common.unit.openai — OpenAIReasoningInstance", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear the service-container globals so openai.ts re-registers its
    // production factories on the next import and MockAzureOpenAI gets
    // re-invoked instead of returning a cached singleton.
    const { reset } = await import("./service-container");
    reset();
    MockAzureOpenAI.mockClear();
  });

  it("common.unit.openai.012: creates reasoning instance with correct baseURL", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "my-instance");
    vi.stubEnv("AZURE_OPENAI_API_REASONING_DEPLOYMENT_NAME", "o1");
    const { OpenAIReasoningInstance } = await import("./openai");
    OpenAIReasoningInstance();
    const opts = MockAzureOpenAI.mock.calls[0][0];
    expect(opts.baseURL).toContain("o1");
    expect(opts.apiVersion).toBe("2025-04-01-preview");
  });

  it("common.unit.openai.013: throws when reasoning env vars missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "");
    vi.stubEnv("AZURE_OPENAI_API_REASONING_DEPLOYMENT_NAME", "");
    const { OpenAIReasoningInstance } = await import("./openai");
    expect(() => OpenAIReasoningInstance()).toThrow("Azure OpenAI Reasoning deployment config is not set");
  });
});

describe("common.unit.openai — OpenAIV1ReasoningInstance", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear the service-container globals so openai.ts re-registers its
    // production factories on the next import and MockAzureOpenAI gets
    // re-invoked instead of returning a cached singleton.
    const { reset } = await import("./service-container");
    reset();
    MockAzureOpenAI.mockClear();
  });

  it("common.unit.openai.014: creates v1 reasoning instance with image deployment header when set", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "my-instance");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "2024-10-21");
    vi.stubEnv("AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT_NAME", "dall-e-3");
    const { OpenAIV1ReasoningInstance } = await import("./openai");
    OpenAIV1ReasoningInstance();
    const opts = MockAzureOpenAI.mock.calls[0][0];
    expect(opts.defaultHeaders).toMatchObject({
      "x-ms-oai-image-generation-deployment": "dall-e-3",
      "api-version": "preview",
      "api-key": "test-key",
    });
  });

  it("common.unit.openai.015: creates v1 reasoning instance without image header when deployment not set", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "my-instance");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "2024-10-21");
    vi.stubEnv("AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT_NAME", "");
    const { OpenAIV1ReasoningInstance } = await import("./openai");
    OpenAIV1ReasoningInstance();
    const opts = MockAzureOpenAI.mock.calls[0][0];
    // No extra image headers (only api-key header from api key path)
    const headers = opts.defaultHeaders ?? {};
    expect(headers["x-ms-oai-image-generation-deployment"]).toBeUndefined();
  });

  it("common.unit.openai.016: throws when v1 reasoning env vars missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "");
    const { OpenAIV1ReasoningInstance } = await import("./openai");
    expect(() => OpenAIV1ReasoningInstance()).toThrow("Azure OpenAI API config is not set");
  });
});

describe("common.unit.openai — OpenAIV1ImageInstance", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear the service-container globals so openai.ts re-registers its
    // production factories on the next import and MockAzureOpenAI gets
    // re-invoked instead of returning a cached singleton.
    const { reset } = await import("./service-container");
    reset();
    MockAzureOpenAI.mockClear();
  });

  it("common.unit.openai.017: creates image instance with image deployment header", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "my-instance");
    vi.stubEnv("AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT_NAME", "dall-e-3");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "2024-10-21");
    const { OpenAIV1ImageInstance } = await import("./openai");
    OpenAIV1ImageInstance();
    const opts = MockAzureOpenAI.mock.calls[0][0];
    expect(opts.defaultHeaders).toMatchObject({
      "x-ms-oai-image-generation-deployment": "dall-e-3",
    });
    expect(opts.maxRetries).toBe(5);
  });

  it("common.unit.openai.018: throws when image env vars missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_INSTANCE_NAME", "");
    vi.stubEnv("AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT_NAME", "");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "");
    const { OpenAIV1ImageInstance } = await import("./openai");
    expect(() => OpenAIV1ImageInstance()).toThrow("Azure OpenAI Image generation config is not set");
  });
});
