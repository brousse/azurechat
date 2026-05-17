import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMenu, GroupChatThreadByType } from "./chat-menu";
import type { ChatThreadModel } from "../chat-services/models";

// Mock child components that rely on next/navigation or server imports
vi.mock("./chat-menu-item", () => ({
  ChatMenuItem: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItemWithIcon: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("./chat-group", () => ({
  ChatGroup: ({ title, children }: any) => (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  ),
}));

function makeThread(
  id: string,
  name: string,
  lastMessageAt: Date,
  bookmarked = false
): ChatThreadModel {
  return {
    id,
    name,
    lastMessageAt,
    bookmarked,
    createdAt: lastMessageAt,
    isDeleted: false,
    type: "CHAT_THREAD",
    userId: "user1",
    useName: "User One",
    isTemporary: false,
  } as unknown as ChatThreadModel;
}

describe("chat-page.unit.components.005 — ChatMenu", () => {
  it("renders thread names", () => {
    const now = new Date();
    const threads = [
      makeThread("1", "Alpha", now),
      makeThread("2", "Beta", new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5)),
    ];
    render(<ChatMenu menuItems={threads} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows 'Past 7 days' header for recent threads", () => {
    const now = new Date();
    const threads = [makeThread("1", "Recent", now)];
    render(<ChatMenu menuItems={threads} />);
    expect(screen.getByText("Past 7 days")).toBeInTheDocument();
  });

  it("shows 'Previous' header for old threads", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);
    const threads = [makeThread("1", "OldThread", oldDate)];
    render(<ChatMenu menuItems={threads} />);
    expect(screen.getByText("Previous")).toBeInTheDocument();
  });

  it("shows 'Bookmarked' header for bookmarked threads", () => {
    const now = new Date();
    const threads = [makeThread("1", "Starred", now, true)];
    render(<ChatMenu menuItems={threads} />);
    expect(screen.getByText("Bookmarked")).toBeInTheDocument();
  });

  it("renders empty list without error", () => {
    const { container } = render(<ChatMenu menuItems={[]} />);
    expect(container).toBeTruthy();
  });
});

describe("GroupChatThreadByType", () => {
  it("buckets threads into Bookmarked / Past 7 days / Previous", () => {
    const now = new Date();
    const old = new Date();
    old.setDate(old.getDate() - 30);

    const threads = [
      makeThread("1", "Old", old),
      makeThread("2", "Recent", now),
      makeThread("3", "Starred", now, true),
    ];
    const result = GroupChatThreadByType(threads);
    expect(result["Bookmarked"]?.length).toBe(1);
    expect(result["Past 7 days"]?.length).toBe(1);
    expect(result["Previous"]?.length).toBe(1);
  });
});
