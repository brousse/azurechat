// Pure helpers for assembling the cache-relevant parts of an Azure OpenAI
// Responses request. Kept side-effect free so the byte-for-byte stability of
// the prompt prefix can be locked down by tests in prompt-builder.test.ts.

export interface PromptBuilderInputs {
  staticSystemPrompt: string;
  personaMessage: string;
  /** ISO-8601 date string, e.g. "2026-04-30". Locale-stable. */
  today: string;
  /** Optional document hint block. Empty string when no documents are attached. */
  documentHint?: string;
}

/**
 * Build the system message body. Output is a pure function of its inputs —
 * identical inputs MUST yield byte-for-byte identical output across processes,
 * pods, and locales. The Azure OpenAI prompt cache keys on the first 1024 tokens
 * of input, so any drift here translates directly into cache misses.
 */
export function buildSystemMessage(inputs: PromptBuilderInputs): string {
  const { staticSystemPrompt, personaMessage, today, documentHint = "" } = inputs;
  return `${staticSystemPrompt} \n\nToday's Date: ${today}${documentHint}\n\n${personaMessage}`;
}

/**
 * Format today's date using ISO-8601 calendar date (`YYYY-MM-DD`). Independent
 * of process locale (unlike `toLocaleDateString()`).
 */
export function isoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Sort function-typed tools by name. The Responses API treats the tools array
 * as part of the request body that participates in the cache key, so its order
 * must be deterministic regardless of which conditional branches/extensions
 * registered each tool.
 *
 * Returns a new array; does not mutate input.
 */
export function sortFunctionTools<T extends { name?: string }>(tools: readonly T[]): T[] {
  return [...tools].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
}
