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
 * Used in addition to rewrite-sandbox-urls.ts: this one fixes the
 * in-session render; the other rewrites the persisted text on `onFinish`.
 * Both share `./sandbox-rewrite-core.ts` so the tool-name allowlist and
 * the rewrite rules cannot drift.
 *
 * If a text-delta's sandbox URL spans two delta chunks (i.e., a chunk ends
 * mid-URL), it is left intact in that chunk — the persisted rewrite in
 * onFinish covers it.
 */

export function createSandboxUrlTransform<TOOLS extends ToolSet>() {
  return (): TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>> => {
    const fileMap = new Map<string, string>();
    return new TransformStream({
      transform(chunk, controller) {
        if (chunk.type === "tool-result") {
          // The AI SDK's TextStreamPart discriminated union surfaces
          // `toolName` and a structured `output` only on the
          // `tool-result` variant. Read them off the typed branch
          // rather than casting via unknown.
          const { toolName, output } = chunk as TextStreamPart<TOOLS> & {
            toolName?: string;
            output?: SandboxToolOutput;
          };
          if (isSandboxEmittingToolName(toolName)) {
            harvestOutput(output, fileMap);
          }
        }

        if (chunk.type === "text-delta") {
          const original = chunk.text;
          const rewritten = rewriteSandboxText(original, fileMap);
          if (rewritten !== original) {
            controller.enqueue({ ...chunk, text: rewritten });
            return;
          }
        }

        controller.enqueue(chunk);
      },
    });
  };
}
