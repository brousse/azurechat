"use server";
import "server-only";

import { OpenAIMiniInstance } from "@/features/common/services/openai";
import type { ChatIntent } from "../models";

const VALID_INTENTS: ReadonlyArray<ChatIntent> = [
  "coding",
  "translation",
  "summarization",
  "data_analysis",
  "creative",
  "general",
];

/**
 * Parse the `{ "title", "intent" }` JSON the mini model returns. Defensive:
 * tolerates code fences / surrounding prose, clamps the title, validates the
 * intent against the union, and NEVER throws (falls back to safe defaults so
 * the fire-and-forget title call can't break a chat).
 */
function parseTitleAndIntent(raw: string): { title: string; intent: ChatIntent } {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { title: "", intent: "general" };
    const obj = JSON.parse(match[0]) as { title?: unknown; intent?: unknown };
    const title =
      typeof obj.title === "string"
        ? obj.title.replace(/["':]/g, "").trim().slice(0, 40).trim()
        : "";
    const intent =
      typeof obj.intent === "string" &&
      (VALID_INTENTS as ReadonlyArray<string>).includes(obj.intent)
        ? (obj.intent as ChatIntent)
        : "general";
    return { title, intent };
  } catch {
    return { title: "", intent: "general" };
  }
}

/**
 * Single cheap mini call that returns BOTH a thread title and a coarse
 * conversation intent for the first user message. Folding intent into the
 * existing title call keeps it free (one request, one model). Fire-and-forget
 * friendly: any failure returns safe defaults rather than throwing.
 */
export const ChatApiTitleAndIntent = async (
  userMessage: string
): Promise<{ title: string; intent: ChatIntent }> => {
  try {
    const openAI = OpenAIMiniInstance();
    const shorter = userMessage.slice(0, 300);
    const systemPrompt = `You label the first message of a chat. Respond with ONLY a JSON object of the form {"title": string, "intent": string}.
- title: a short summary or keywords of the user's message, at most 40 characters, no quotes or colons.
- intent: exactly one of "coding", "translation", "summarization", "data_analysis", "creative", "general". Use "general" when unsure.
USERPROMPT: ${shorter}`;

    const response = await openAI.chat.completions.create({
      model: "",
      max_completion_tokens: 1000,
      stream: false,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: systemPrompt }],
        },
      ],
      ...({ prompt_cache_retention: "24h" } as { prompt_cache_retention: string }),
    });

    return parseTitleAndIntent(response.choices[0]?.message?.content ?? "");
  } catch {
    return { title: "", intent: "general" };
  }
};

export const ChatApiText = async (
  userMessage: string
) => {
  const openAI = OpenAIMiniInstance();

  const response = await openAI.chat.completions.create({
    model: "",
    max_completion_tokens: 1000,
    stream: false,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userMessage }],
      },
    ],
    // Retain prompt cache entries for 24h (Azure OpenAI).
    // Spread-cast: `prompt_cache_retention` is an Azure OpenAI parameter
    // not yet present in the openai SDK type definitions.
    ...({ prompt_cache_retention: "24h" } as { prompt_cache_retention: string }),
  });

  return response.choices[0].message.content as string;
};
