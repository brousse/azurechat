import type { TextStreamPart, ToolSet } from "ai";
import {
  harvestOutput,
  isSandboxEmittingToolName,
  rewriteSandboxText,
  type SandboxToolOutput,
} from "./sandbox-rewrite-core";

/**
 * sandbox-url-transform.ts
 *
 * AI SDK stream transform that rewrites `sandbox:/mnt/data/<file>` URLs in
 * text-delta chunks using filename→URL pairs harvested from tool-result
 * chunks earlier in the stream. Because tool results arrive before the
 * model's prose references them, the map is populated by the time the
 * sandbox URLs flow through.
 *
 * Per-text-stream buffering handles the cross-delta case: Azure splits
 * sandbox URLs across many small text-delta chunks (e.g. `sandbox`, `:/`,
 * `mnt`, `/data`, `/random`, `_py`, `plot`, `.png`, `)`), so naive
 * per-delta substitution never sees the full pattern. The transform
 * keeps a `pendingTail` that holds back any suffix which COULD be the
 * start of a sandbox URL; once enough deltas accumulate to either
 * complete (terminator char) or rule out (different content) the
 * sequence, the buffered portion is rewritten and emitted.
 *
 * Used in addition to rewrite-sandbox-urls.ts: this one fixes the
 * in-session render; the other rewrites the persisted text on `onFinish`.
 * Both share `./sandbox-rewrite-core.ts` so the tool-name allowlist and
 * the rewrite rules cannot drift.
 */

/** Characters that terminate a sandbox URL in markdown (paren, quote, whitespace). */
const SANDBOX_TERMINATOR = /[\s)\]"'>]/;

/**
 * Returns the index in `buffer` at which an incomplete (un-terminated)
 * sandbox URL starts at the end of the buffer, or -1 if the buffer can be
 * emitted in full. Two cases:
 *   - The buffer ends with a strict prefix of the literal "sandbox" (e.g.
 *     "sand", "sandbo"), which might become a sandbox URL on the next
 *     delta.
 *   - The buffer contains a `sandbox:` token (or further) with NO
 *     terminator between it and the end of the buffer — the URL itself
 *     is mid-stream.
 */
function findHoldBackStart(buffer: string): number {
  // Check trailing prefixes of "sandbox" (longest first so we keep the
  // smallest possible suffix held back).
  const SANDBOX_PREFIXES = [
    "sandbox",
    "sandbo",
    "sandb",
    "sand",
    "san",
    "sa",
    "s",
  ];
  for (const p of SANDBOX_PREFIXES) {
    if (buffer.endsWith(p)) return buffer.length - p.length;
  }
  // Find the LAST "sandbox:" occurrence and check whether everything after
  // it lacks a terminator — that's an in-flight URL.
  const lastIdx = buffer.lastIndexOf("sandbox:");
  if (lastIdx === -1) return -1;
  const tail = buffer.slice(lastIdx);
  if (SANDBOX_TERMINATOR.test(tail)) return -1;
  return lastIdx;
}

export function createSandboxUrlTransform<TOOLS extends ToolSet>() {
  return (): TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>> => {
    const fileMap = new Map<string, string>();
    // Per-text-stream pending tails. Keyed by text-part id so multiple
    // concurrent text parts (rare, but the spec allows it) don't smear
    // into each other.
    const pendingByPartId = new Map<string, string>();

    return new TransformStream({
      transform(chunk, controller) {
        if (chunk.type === "tool-result") {
          const { toolName, output } = chunk as TextStreamPart<TOOLS> & {
            toolName?: string;
            output?: SandboxToolOutput;
          };
          if (isSandboxEmittingToolName(toolName)) {
            harvestOutput(output, fileMap);
          }
        }

        if (chunk.type === "text-delta") {
          const partId = (chunk as { id: string }).id;
          const buffered = (pendingByPartId.get(partId) ?? "") + chunk.text;
          const holdFrom = findHoldBackStart(buffered);
          const emittable =
            holdFrom === -1 ? buffered : buffered.slice(0, holdFrom);
          const newPending =
            holdFrom === -1 ? "" : buffered.slice(holdFrom);
          pendingByPartId.set(partId, newPending);
          if (emittable.length === 0) {
            // Nothing emittable yet — entire buffer is mid-URL. Don't
            // forward anything; wait for the next delta to extend it.
            return;
          }
          const rewritten = rewriteSandboxText(emittable, fileMap);
          controller.enqueue({ ...chunk, text: rewritten });
          return;
        }

        if (chunk.type === "text-end") {
          // Flush any remaining buffered text for this part — it never
          // completed into a sandbox URL, so emit it as-is (rewriter
          // still passes it through; if a real but un-terminated URL
          // somehow reached here it stays intact and gets caught by the
          // onFinish persist-time rewrite).
          const partId = (chunk as { id: string }).id;
          const tail = pendingByPartId.get(partId) ?? "";
          if (tail.length > 0) {
            controller.enqueue({
              type: "text-delta",
              id: partId,
              text: rewriteSandboxText(tail, fileMap),
            } as TextStreamPart<TOOLS>);
          }
          pendingByPartId.delete(partId);
        }

        controller.enqueue(chunk);
      },
    });
  };
}
