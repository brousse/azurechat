import { describe, it, expect } from "vitest";
import { AI_NAME } from "./customise";

describe("theme/customise", () => {
  it("theme.unit.customise.001: exposes the customised AI_NAME constant", () => {
    expect(AI_NAME).toBe("Bühler ChatGPT");
  });
});
