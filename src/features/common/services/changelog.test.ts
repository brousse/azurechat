import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { promises as fsPromises } from "fs";
import { getChangelog } from "./changelog";

const readFileSpy = vi.spyOn(fsPromises, "readFile");

beforeEach(() => {
  readFileSpy.mockReset();
});

afterAll(() => {
  readFileSpy.mockRestore();
});

describe("common.unit.changelog — getChangelog", () => {
  it("common.unit.changelog.001: returns file content on success", async () => {
    readFileSpy.mockResolvedValue("# Changelog\n\n## v1.0.0\n- Initial release" as any);
    const result = await getChangelog();
    expect(result).toContain("# Changelog");
    expect(result).toContain("v1.0.0");
  });

  it("common.unit.changelog.002: throws wrapped error when readFile fails with Error", async () => {
    readFileSpy.mockRejectedValue(new Error("ENOENT: no such file"));
    await expect(getChangelog()).rejects.toThrow("Failed to fetch changelog: ENOENT: no such file");
  });

  it("common.unit.changelog.003: throws generic message when error is not an Error instance", async () => {
    readFileSpy.mockRejectedValue("string error");
    await expect(getChangelog()).rejects.toThrow("Failed to fetch changelog: Unknown error");
  });

  it("common.unit.changelog.004: reads from the public/changelog.md path", async () => {
    readFileSpy.mockResolvedValue("content" as any);
    await getChangelog();
    expect(readFileSpy).toHaveBeenCalledWith(
      expect.stringContaining("changelog.md"),
      "utf-8",
    );
  });
});
