import { describe, it, expect } from "vitest";
import { refineFromEmpty } from "./schema-validation";

describe("common.unit.schema — refineFromEmpty", () => {
  it("common.unit.schema.001: accepts empty string", () => {
    expect(refineFromEmpty("")).toBe(true);
  });

  it("common.unit.schema.002: rejects whitespace-only", () => {
    expect(refineFromEmpty("   ")).toBe(false);
  });

  it("common.unit.schema.003: accepts content with internal whitespace", () => {
    expect(refineFromEmpty("a b")).toBe(true);
  });
});
