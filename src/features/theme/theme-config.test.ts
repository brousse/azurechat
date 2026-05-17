import { describe, it, expect } from "vitest";
import {
  AI_NAME,
  AI_DESCRIPTION,
  CHAT_DEFAULT_PERSONA,
  CHAT_DEFAULT_SYSTEM_PROMPT,
  NEW_CHAT_NAME,
  TEMPORARY_CHAT_NAME,
  TEMPORARY_CHAT_ROUTE,
} from "./theme-config";

describe("theme-config constants", () => {
  it("theme.unit.config.001: AI_NAME is the configured brand", () => {
    expect(AI_NAME).toBe("Bühler Chat");
  });

  it("theme.unit.config.002: AI_DESCRIPTION mentions the brand", () => {
    expect(AI_DESCRIPTION).toContain(AI_NAME);
  });

  it("theme.unit.config.003: CHAT_DEFAULT_PERSONA composes from AI_NAME", () => {
    expect(CHAT_DEFAULT_PERSONA).toBe(`${AI_NAME} default`);
  });

  it("theme.unit.config.004: CHAT_DEFAULT_SYSTEM_PROMPT references the brand and enforces markdown", () => {
    expect(CHAT_DEFAULT_SYSTEM_PROMPT).toContain(AI_NAME);
    expect(CHAT_DEFAULT_SYSTEM_PROMPT).toMatch(/Markdown/i);
  });

  it("theme.unit.config.005: NEW_CHAT_NAME is the new-thread placeholder", () => {
    expect(NEW_CHAT_NAME).toBe("New chat");
  });

  it("theme.unit.config.006: temporary chat constants are paired", () => {
    expect(TEMPORARY_CHAT_NAME).toBe("Temporary Chat");
    expect(TEMPORARY_CHAT_ROUTE).toBe("/chat/temporary");
  });
});
