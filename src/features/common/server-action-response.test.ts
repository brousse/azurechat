import { describe, it, expect } from "vitest";
import { zodErrorsToServerActionErrors } from "./server-action-response";
import type { ZodIssue } from "zod";

describe("common.unit.sar — zodErrorsToServerActionErrors", () => {
  it("common.unit.sar.001: strips ZodIssue down to {message}", () => {
    const issues: ZodIssue[] = [
      { message: "x", path: ["a"], code: "custom" } as ZodIssue,
    ];
    const result = zodErrorsToServerActionErrors(issues);
    expect(result).toEqual([{ message: "x" }]);
    // Ensure no extra fields leaked
    expect(Object.keys(result[0])).toEqual(["message"]);
  });

  it("common.unit.sar.002: handles empty array", () => {
    expect(zodErrorsToServerActionErrors([])).toEqual([]);
  });
});
