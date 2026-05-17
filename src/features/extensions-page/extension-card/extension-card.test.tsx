import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── server-action stubs ──────────────────────────────────────────────────────
vi.mock("../extension-services/extension-service", () => ({
  CreateExtension: vi.fn().mockResolvedValue({ status: "OK", response: {} }),
  UpdateExtension: vi.fn().mockResolvedValue({ status: "OK", response: {} }),
  DeleteExtension: vi.fn().mockResolvedValue({ status: "OK", response: {} }),
  CreateChatWithExtension: vi.fn().mockResolvedValue({
    status: "OK",
    response: { id: "chat-1" },
  }),
}));

vi.mock("../extension-store", () => ({
  extensionStore: {
    openAndUpdate: vi.fn(),
  },
}));

vi.mock("./extension-context-menu", () => ({
  ExtensionCardContextMenu: ({ extension }: any) => (
    <button data-testid="context-menu">{extension.name} menu</button>
  ),
}));

vi.mock("./start-new-extension-chat", () => ({
  StartNewExtensionChat: ({ extension }: any) => (
    <button data-testid="start-chat">Start chat: {extension.name}</button>
  ),
}));

import { ExtensionCard } from "./extension-card";
import { extensionStore } from "../extension-store";
import type { ExtensionModel } from "../extension-services/models";

const extension: ExtensionModel = {
  id: "e1",
  name: "TestExtension",
  description: "A test description",
  executionSteps: "Do these steps",
  createdAt: new Date(),
  isPublished: false,
  type: "EXTENSION",
  functions: [],
  headers: [],
  userId: "u1",
};

describe("extensions-page.unit.components.E2 — ExtensionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── positive — with action menu ──────────────────────────────────────────
  it("renders extension name and description", () => {
    render(<ExtensionCard extension={extension} showActionMenu={false} />);
    expect(screen.getByText("TestExtension")).toBeInTheDocument();
    expect(screen.getByText("A test description")).toBeInTheDocument();
  });

  it("renders StartNewExtensionChat button", () => {
    render(<ExtensionCard extension={extension} showActionMenu={false} />);
    expect(screen.getByTestId("start-chat")).toBeInTheDocument();
  });

  it("renders context menu when showActionMenu=true", () => {
    render(<ExtensionCard extension={extension} showActionMenu={true} />);
    expect(screen.getByTestId("context-menu")).toBeInTheDocument();
  });

  it("renders pencil/edit button when showActionMenu=true", () => {
    render(<ExtensionCard extension={extension} showActionMenu={true} />);
    // The edit button has title "Show message"
    expect(screen.getByTitle("Show message")).toBeInTheDocument();
  });

  it("calls extensionStore.openAndUpdate when edit button clicked", async () => {
    render(<ExtensionCard extension={extension} showActionMenu={true} />);
    await userEvent.click(screen.getByTitle("Show message"));
    expect(extensionStore.openAndUpdate).toHaveBeenCalledWith(extension);
  });

  // ── negative — without action menu ──────────────────────────────────────
  it("does NOT render context menu when showActionMenu=false", () => {
    render(<ExtensionCard extension={extension} showActionMenu={false} />);
    expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
  });

  it("does NOT render edit button when showActionMenu=false", () => {
    render(<ExtensionCard extension={extension} showActionMenu={false} />);
    expect(screen.queryByTitle("Show message")).not.toBeInTheDocument();
  });

  it("still renders StartNewExtensionChat even when showActionMenu=false", () => {
    render(<ExtensionCard extension={extension} showActionMenu={false} />);
    expect(screen.getByTestId("start-chat")).toBeInTheDocument();
  });
});
