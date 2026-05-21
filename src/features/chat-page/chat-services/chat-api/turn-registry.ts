import "server-only";

/**
 * turn-registry.ts
 *
 * Per-replica in-memory registry of in-flight UI message streams keyed
 * by turnId. Enables resume-by-turn-id: a client that disconnects mid-
 * stream and reconnects (within the same replica) can reattach to the
 * still-running stream instead of falling back to polling.
 *
 * Architect2 SEV-2 B7+B8 + SERIOUS #23.
 *
 * Limitations (documented; not bugs):
 *   - Per-replica only. In Azure Container Apps with replicaCount > 1,
 *     a client returning to a different replica falls back to the
 *     polling pill (capped at 60 s by #27) + the persisted assistant
 *     row written by onFinish.
 *   - Per-process memory. If the process is recycled the stream is
 *     lost — the reconcile sweep on the next claim-active-turn (#35)
 *     handles that path.
 *   - One reader per stream. A second `GET /api/chat?turnId=...` for
 *     the same in-flight turn will fail with 409; resume from a single
 *     reconnecting tab is supported, simultaneous viewers are not.
 *
 * Multi-replica support is a follow-up — would need Redis pub/sub or
 * a Cosmos-checkpointed partial output that any replica can read.
 */

/** Reusable handle: the stream itself + an optional cleanup hook. */
interface RegisteredStream {
  /** Ready-to-pipe UI-message stream (toUIMessageStream() output). */
  stream: ReadableStream<unknown>;
  /** Wall-clock when the turn was registered, for TTL eviction. */
  registeredAt: number;
  /** Whether the stream has already been taken by a consumer. */
  taken: boolean;
}

const registry = new Map<string, RegisteredStream>();

// Stale-entry sweep TTL is the same constant as the per-thread mutex
// TTL — see ./turn-ttl.ts for the rationale.
import { ACTIVE_TURN_TTL_MS as STREAM_TTL_MS } from "./turn-ttl";

/**
 * Register an in-flight stream under its turnId. Called by POST after
 * streamText is wired up but before the response is returned.
 *
 * Returns the original stream so the caller can also send it as the
 * POST response body — the registry-stored copy is what a future GET
 * will pick up.
 *
 * If two streams race to register the same turnId (shouldn't happen
 * thanks to the per-thread mutex #30, but defensively), the second
 * call evicts the first.
 */
export function registerTurnStream(
  turnId: string,
  stream: ReadableStream<unknown>,
): void {
  pruneStale();
  registry.set(turnId, {
    stream,
    registeredAt: Date.now(),
    taken: false,
  });
}

/**
 * Atomically claim the registered stream for `turnId`. Returns null if
 * no such turn is registered, the entry is stale, or the stream has
 * already been taken by an earlier reader.
 *
 * "Taken" is a soft assertion: ReadableStream itself enforces single-
 * reader semantics so a second call would fail at read time anyway;
 * this just lets the GET handler return 409 cleanly without trying to
 * read first.
 */
export function takeTurnStream(turnId: string): ReadableStream<unknown> | null {
  pruneStale();
  const entry = registry.get(turnId);
  if (!entry) return null;
  if (entry.taken) return null;
  if (Date.now() - entry.registeredAt > STREAM_TTL_MS) {
    registry.delete(turnId);
    return null;
  }
  entry.taken = true;
  return entry.stream;
}

/**
 * Remove the entry — called from onFinish so we don't accumulate
 * completed-stream references after the turn lands in Cosmos.
 */
export function unregisterTurnStream(turnId: string): void {
  registry.delete(turnId);
}

/** Test-only helpers. */
export function __resetTurnRegistry(): void {
  registry.clear();
}
export function __getTurnRegistrySize(): number {
  return registry.size;
}

function pruneStale(): void {
  const now = Date.now();
  for (const [id, entry] of registry) {
    if (now - entry.registeredAt > STREAM_TTL_MS) {
      registry.delete(id);
    }
  }
}
