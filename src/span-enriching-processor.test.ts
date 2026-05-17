import { describe, it, expect, vi } from "vitest";
import { SpanKind, TraceFlags } from "@opentelemetry/api";
import { SpanEnrichingProcessor } from "./span-enriching-processor";

function makeSpan(kind: SpanKind) {
  const ctx = { traceFlags: TraceFlags.SAMPLED, traceId: "t", spanId: "s" };
  return {
    kind,
    spanContext: () => ctx,
    _ctx: ctx,
  } as any;
}

describe("SpanEnrichingProcessor", () => {
  const proc = new SpanEnrichingProcessor();

  it("instrumentation.unit.span.001: forceFlush resolves", async () => {
    await expect(proc.forceFlush()).resolves.toBeUndefined();
  });

  it("instrumentation.unit.span.002: shutdown resolves", async () => {
    await expect(proc.shutdown()).resolves.toBeUndefined();
  });

  it("instrumentation.unit.span.003: onStart is a no-op", () => {
    expect(() => proc.onStart(makeSpan(SpanKind.SERVER) as any)).not.toThrow();
  });

  it("instrumentation.unit.span.004: onEnd suppresses INTERNAL spans by zeroing traceFlags", () => {
    const span = makeSpan(SpanKind.INTERNAL);
    proc.onEnd(span);
    expect(span._ctx.traceFlags).toBe(TraceFlags.NONE);
  });

  it("instrumentation.unit.span.005: onEnd leaves SERVER spans sampled", () => {
    const span = makeSpan(SpanKind.SERVER);
    proc.onEnd(span);
    expect(span._ctx.traceFlags).toBe(TraceFlags.SAMPLED);
  });

  it("instrumentation.unit.span.006: onEnd leaves CLIENT spans sampled", () => {
    const span = makeSpan(SpanKind.CLIENT);
    proc.onEnd(span);
    expect(span._ctx.traceFlags).toBe(TraceFlags.SAMPLED);
  });
});
