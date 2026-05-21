import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  registerTurnStream,
  takeTurnStream,
  unregisterTurnStream,
  __resetTurnRegistry,
  __getTurnRegistrySize,
} from "./turn-registry";

function dummyStream(): ReadableStream<unknown> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue("chunk-1");
      controller.close();
    },
  });
}

describe("turn-registry", () => {
  beforeEach(() => {
    __resetTurnRegistry();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for unknown turnId", () => {
    expect(takeTurnStream("nope")).toBeNull();
  });

  it("returns the registered stream on first take, null on second", () => {
    const s = dummyStream();
    registerTurnStream("turn-1", s);
    expect(takeTurnStream("turn-1")).toBe(s);
    expect(takeTurnStream("turn-1")).toBeNull();
  });

  it("evicts after STREAM_TTL_MS (10 min) on next operation", () => {
    registerTurnStream("turn-2", dummyStream());
    expect(__getTurnRegistrySize()).toBe(1);
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(takeTurnStream("turn-2")).toBeNull();
    expect(__getTurnRegistrySize()).toBe(0);
  });

  it("unregisterTurnStream removes the entry", () => {
    registerTurnStream("turn-3", dummyStream());
    unregisterTurnStream("turn-3");
    expect(takeTurnStream("turn-3")).toBeNull();
  });

  it("isolates entries per turnId", () => {
    const sA = dummyStream();
    const sB = dummyStream();
    registerTurnStream("a", sA);
    registerTurnStream("b", sB);
    expect(takeTurnStream("a")).toBe(sA);
    expect(takeTurnStream("b")).toBe(sB);
  });

  it("re-registering the same turnId evicts the prior entry", () => {
    const first = dummyStream();
    const second = dummyStream();
    registerTurnStream("turn-4", first);
    registerTurnStream("turn-4", second);
    expect(takeTurnStream("turn-4")).toBe(second);
  });
});
