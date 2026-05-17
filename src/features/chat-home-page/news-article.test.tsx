import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewsArticle } from "./news-article";

const article = {
  id: "1",
  title: "Breaking News",
  description: "Something happened today.",
  link: "https://example.com/article",
};

describe("chat-home-page.unit.003 — NewsArticle", () => {
  it("renders title and description", () => {
    render(<NewsArticle newsArticle={article} />);
    expect(screen.getByText("Breaking News")).toBeInTheDocument();
    expect(screen.getByText("Something happened today.")).toBeInTheDocument();
  });

  it("renders a 'Read more' link pointing to the article URL", () => {
    render(<NewsArticle newsArticle={article} />);
    const link = screen.getByRole("link", { name: /read more/i });
    expect(link).toHaveAttribute("href", "https://example.com/article");
  });
});
