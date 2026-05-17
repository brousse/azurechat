import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RevalidateCache, RedirectToPage, RedirectToChatThread } from "./navigation-helpers";

describe("common.unit.nav — RevalidateCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("common.unit.nav.001: revalidates /{page} when no params", async () => {
    await RevalidateCache({ page: "chat" });
    expect(revalidatePath).toHaveBeenCalledWith("/chat", undefined);
  });

  it("common.unit.nav.002: revalidates /{page}/{params} with type forwarded", async () => {
    await RevalidateCache({ page: "persona", params: "abc", type: "layout" });
    expect(revalidatePath).toHaveBeenCalledWith("/persona/abc", "layout");
  });
});

describe("common.unit.nav — RedirectToPage", () => {
  it("common.unit.nav.003: throws NEXT_REDIRECT:/agent", async () => {
    await expect(RedirectToPage("agent")).rejects.toThrow("NEXT_REDIRECT:/agent");
  });
});

describe("common.unit.nav — RedirectToChatThread", () => {
  it("common.unit.nav.004: throws NEXT_REDIRECT:/chat/:id", async () => {
    await expect(RedirectToChatThread("thread-1")).rejects.toThrow("NEXT_REDIRECT:/chat/thread-1");
  });
});
