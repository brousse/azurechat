import { describe, it, expect } from "vitest";
import { uniqueId, sortByTimestamp } from "./util";
import type { ChatThreadModel } from "@/features/chat-page/chat-services/models";

describe("common.unit.util — uniqueId", () => {
  it("common.unit.util.001: returns 36-char id from documented alphabet", () => {
    const id = uniqueId();
    expect(id).toHaveLength(36);
    expect(/^[0-9A-Za-z]+$/.test(id)).toBe(true);
  });

  it("common.unit.util.002: produces no collisions in 10k draws", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      ids.add(uniqueId());
    }
    expect(ids.size).toBe(10_000);
  });
});

// Minimal ChatThreadModel shape sufficient for sort tests
function makeThread(lastMessageAt: string): ChatThreadModel {
  return {
    id: uniqueId(),
    name: "thread",
    userId: "user",
    useName: "",
    personaMessage: "",
    isDeleted: false,
    bookmarked: false,
    isTemporary: false,
    lastMessageAt,
    createdAt: lastMessageAt,
    type: "CHAT_THREAD",
    selectedModel: "gpt-5.4",
    extension: [],
    attachedFiles: [],
  } as any;
}

describe("common.unit.util — sortByTimestamp", () => {
  it("common.unit.util.003: sorts by lastMessageAt descending", () => {
    const threads = [
      makeThread("2024-01-01T00:00:00Z"),
      makeThread("2024-06-01T00:00:00Z"),
      makeThread("2024-03-01T00:00:00Z"),
    ];
    const sorted = [...threads].sort(sortByTimestamp);
    expect(sorted[0].lastMessageAt).toBe("2024-06-01T00:00:00Z");
    expect(sorted[1].lastMessageAt).toBe("2024-03-01T00:00:00Z");
    expect(sorted[2].lastMessageAt).toBe("2024-01-01T00:00:00Z");
  });

  it("common.unit.util.004: returns 0 for equal timestamps (stable)", () => {
    const t1 = makeThread("2024-04-01T00:00:00Z");
    const t2 = makeThread("2024-04-01T00:00:00Z");
    expect(sortByTimestamp(t1, t2)).toBe(0);
    expect(sortByTimestamp(t2, t1)).toBe(0);
  });
});
