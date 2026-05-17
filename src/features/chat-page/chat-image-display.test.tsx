import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("./chat-services/chat-image-persistence-utils", () => ({
  isImageReference: vi.fn(),
}));

import { isImageReference } from "./chat-services/chat-image-persistence-utils";
import { ChatImageDisplay } from "./chat-image-display";

describe("chat-page.unit.components — ChatImageDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isImageReference as any).mockReturnValue(false);
  });

  it("renders nothing when imageUrl is undefined", () => {
    const { container } = render(<ChatImageDisplay />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an img when imageUrl is a plain URL", async () => {
    render(<ChatImageDisplay imageUrl="https://example.com/img.png" alt="test" />);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "test" })).toBeInTheDocument();
    });
    expect(screen.getByRole("img").getAttribute("src")).toBe("https://example.com/img.png");
  });

  it("resolves a blob:// reference to the /api/images URL", async () => {
    (isImageReference as any).mockReturnValue(true);
    render(<ChatImageDisplay imageUrl="blob://thread123/img456" alt="resolved" />);
    await waitFor(() => {
      const img = screen.getByRole("img", { name: "resolved" });
      expect(img.getAttribute("src")).toBe("/api/images?t=thread123&img=img456");
    });
  });

  it("shows error state when blob reference is malformed", async () => {
    (isImageReference as any).mockReturnValue(true);
    render(<ChatImageDisplay imageUrl="blob://no-slash" alt="bad" />);
    await waitFor(() => {
      expect(screen.getByText(/error loading image/i)).toBeInTheDocument();
    });
  });

  it("applies custom className to the rendered img", async () => {
    render(<ChatImageDisplay imageUrl="https://example.com/img.png" className="my-class" />);
    await waitFor(() => {
      expect(screen.getByRole("img").className).toContain("my-class");
    });
  });

  it("defaults alt to 'Chat image'", async () => {
    render(<ChatImageDisplay imageUrl="https://example.com/img.png" />);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Chat image" })).toBeInTheDocument();
    });
  });
});
