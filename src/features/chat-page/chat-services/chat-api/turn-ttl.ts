import "server-only";

/**
 * TTL for entries in the per-replica `turn-registry`. A stream that
 * registers under `turnId` but is never picked up by a resume `GET
 * /api/chat?turnId=...` within this window gets evicted on the next
 * `pruneStale` pass. Bounded so a process recycled mid-stream can't
 * leak ReadableStream references indefinitely.
 */
export const ACTIVE_TURN_TTL_MS = 10 * 60 * 1000; // 10 minutes
