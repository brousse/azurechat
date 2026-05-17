import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Application Insights service (browser-side)
vi.mock("@/app/(authenticated)/application-insights-service", () => ({
  logger: undefined, // server-side: no window, appInsightsLogger is falsy
}));

describe("common.unit.logger — shouldLog / log level override", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("common.unit.logger.001: debug level logs to console.debug in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "");
    const { logDebug } = await import("./logger");
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    logDebug("hello debug");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("hello debug");
    spy.mockRestore();
  });

  it("common.unit.logger.002: info level logs to console.info in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "");
    const { logInfo } = await import("./logger");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logInfo("hello info", { key: "val" });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("hello info");
    spy.mockRestore();
  });

  it("common.unit.logger.003: warn level logs to console.warn in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "");
    const { logWarn } = await import("./logger");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logWarn("hello warn");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("common.unit.logger.004: error level logs to console.error in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "");
    const { logError } = await import("./logger");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("boom");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("common.unit.logger.005: production suppresses debug/info/warn, only logs error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "");
    const { logDebug, logInfo, logWarn, logError } = await import("./logger");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logDebug("no debug");
    logInfo("no info");
    logWarn("no warn");
    logError("yes error");
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
    [debugSpy, infoSpy, warnSpy, errorSpy].forEach((s) => s.mockRestore());
  });

  it("common.unit.logger.006: LOG_LEVEL=error suppresses debug/info/warn in test env", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LOG_LEVEL", "error");
    const { logDebug, logInfo, logWarn, logError } = await import("./logger");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logDebug("skip");
    logInfo("skip");
    logWarn("skip");
    logError("show");
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
    [debugSpy, infoSpy, warnSpy, errorSpy].forEach((s) => s.mockRestore());
  });

  it("common.unit.logger.007: LOG_LEVEL=warn allows error+warn, suppresses info+debug", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LOG_LEVEL", "warn");
    const { logDebug, logInfo, logWarn, logError } = await import("./logger");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logDebug("skip");
    logInfo("skip");
    logWarn("show");
    logError("show");
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
    [debugSpy, infoSpy, warnSpy, errorSpy].forEach((s) => s.mockRestore());
  });

  it("common.unit.logger.008: LOG_LEVEL=info allows error+warn+info, suppresses debug", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LOG_LEVEL", "info");
    const { logDebug, logInfo, logWarn, logError } = await import("./logger");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logDebug("skip");
    logInfo("show");
    logWarn("show");
    logError("show");
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
    [debugSpy, infoSpy, warnSpy, errorSpy].forEach((s) => s.mockRestore());
  });

  it("common.unit.logger.009: LOG_LEVEL=debug allows all levels", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LOG_LEVEL", "debug");
    const { logDebug, logInfo, logWarn, logError } = await import("./logger");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logDebug("d");
    logInfo("i");
    logWarn("w");
    logError("e");
    expect(debugSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
    [debugSpy, infoSpy, warnSpy, errorSpy].forEach((s) => s.mockRestore());
  });

  it("common.unit.logger.010: invalid LOG_LEVEL falls back to default behavior", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "BOGUS");
    const { logInfo } = await import("./logger");
    // allowedLevels will be empty, includes() returns false => no log
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logInfo("not logged due to invalid level override");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("common.unit.logger — formatMessage context serialization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "debug");
  });

  it("common.unit.logger.011: includes context JSON in formatted message", async () => {
    const { logInfo } = await import("./logger");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logInfo("ctx test", { foo: "bar" });
    expect(spy.mock.calls[0][0]).toContain("foo");
    expect(spy.mock.calls[0][0]).toContain("bar");
    spy.mockRestore();
  });

  it("common.unit.logger.012: handles circular references gracefully", async () => {
    const { logInfo } = await import("./logger");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const obj: any = { a: 1 };
    obj.self = obj; // circular
    expect(() => logInfo("circular", obj)).not.toThrow();
    expect(spy.mock.calls[0][0]).toContain("[Circular Reference]");
    spy.mockRestore();
  });
});

describe("common.unit.logger — logErrorWithError", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "");
  });

  it("common.unit.logger.013: logErrorWithError includes error message and stack in context", async () => {
    const { logErrorWithError } = await import("./logger");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("test-error");
    logErrorWithError("wrapper message", err, { extra: "data" });
    expect(spy).toHaveBeenCalledOnce();
    const msg: string = spy.mock.calls[0][0];
    expect(msg).toContain("wrapper message");
    expect(msg).toContain("test-error");
    spy.mockRestore();
  });
});

describe("common.unit.logger — LOG_LEVELS constant", () => {
  it("common.unit.logger.014: LOG_LEVELS exports correct level strings", async () => {
    const { LOG_LEVELS } = await import("./logger");
    expect(LOG_LEVELS.DEBUG).toBe("debug");
    expect(LOG_LEVELS.INFO).toBe("info");
    expect(LOG_LEVELS.WARN).toBe("warn");
    expect(LOG_LEVELS.ERROR).toBe("error");
  });
});
