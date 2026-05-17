import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./extension-services/extension-service", () => ({
  CreateExtension: vi.fn().mockResolvedValue({ status: "OK", response: {} }),
  UpdateExtension: vi.fn().mockResolvedValue({ status: "OK", response: {} }),
  DeleteExtension: vi.fn().mockResolvedValue({ status: "OK", response: {} }),
  CreateChatWithExtension: vi.fn().mockResolvedValue({ status: "OK", response: { id: "chat-1" } }),
}));

vi.mock("../auth-page/helpers", () => ({
  userHashedId: vi.fn().mockResolvedValue("hashed-u1"),
}));

vi.mock("./extension-card/extension-card", () => ({
  ExtensionCard: ({ extension, showActionMenu }: any) => (
    <div data-testid={`extension-card-${extension.id}`} data-action={String(showActionMenu)}>
      {extension.name}
    </div>
  ),
}));

vi.mock("./extension-hero/extension-hero", () => ({
  ExtensionHero: () => <div data-testid="extension-hero" />,
}));

vi.mock("./add-extension/add-new-extension", () => ({
  AddExtension: () => <div data-testid="add-extension" />,
}));

import { ExtensionPage } from "./extension-page";
import type { ExtensionModel } from "./extension-services/models";

const makeExtension = (overrides: Partial<ExtensionModel> = {}): ExtensionModel => ({
  id: "e1",
  name: "My Extension",
  description: "desc",
  executionSteps: "steps",
  createdAt: new Date(),
  isPublished: false,
  type: "EXTENSION",
  functions: [],
  headers: [],
  userId: "u1",
  ...overrides,
});

async function renderPage(extensions: ExtensionModel[]) {
  const el = (await ExtensionPage({ extensions })) as React.ReactElement;
  return render(el);
}

describe("extensions-page.unit.components.E1 — ExtensionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the ExtensionHero", async () => {
    await renderPage([]);
    expect(screen.getByTestId("extension-hero")).toBeInTheDocument();
  });

  it("renders the AddExtension sheet trigger", async () => {
    await renderPage([]);
    expect(screen.getByTestId("add-extension")).toBeInTheDocument();
  });

  it("renders an ExtensionCard for each extension in props", async () => {
    const exts = [makeExtension({ id: "e1", name: "Ext1" }), makeExtension({ id: "e2", name: "Ext2" })];
    await renderPage(exts);
    expect(screen.getByTestId("extension-card-e1")).toBeInTheDocument();
    expect(screen.getByTestId("extension-card-e2")).toBeInTheDocument();
  });

  it("renders nothing when extensions array is empty (no card)", async () => {
    await renderPage([]);
    expect(screen.queryByTestId(/^extension-card-/)).not.toBeInTheDocument();
  });

  it("renders extension name text inside each card", async () => {
    await renderPage([makeExtension({ id: "e1", name: "Alpha" })]);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("passes showActionMenu=true only for extensions owned by current user", async () => {
    await renderPage([
      makeExtension({ id: "owned", userId: "hashed-u1" }),
      makeExtension({ id: "other", userId: "someone-else" }),
    ]);
    expect(screen.getByTestId("extension-card-owned").getAttribute("data-action")).toBe("true");
    expect(screen.getByTestId("extension-card-other").getAttribute("data-action")).toBe("false");
  });
});
