import { describe, it, expect } from "vitest";
import { SESSION_EXPIRED_ERROR_CODE } from "./error-codes";

// no negative needed — pure constant module
describe("common.unit.error-codes", () => {
  it("common.unit.error-codes.001: SESSION_EXPIRED_ERROR_CODE has the expected string value", () => {
    expect(SESSION_EXPIRED_ERROR_CODE).toBe("SESSION_EXPIRED");
  });

  it("common.unit.error-codes.002: SESSION_EXPIRED_ERROR_CODE is a string type", () => {
    expect(typeof SESSION_EXPIRED_ERROR_CODE).toBe("string");
  });
});
