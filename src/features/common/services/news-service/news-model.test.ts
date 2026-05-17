import { describe, it, expect } from "vitest";
import { NewsArticleModelSchema, NEWS_ARTICLE } from "./news-model";

describe("common.unit.news-model — NewsArticleModelSchema", () => {
  const validArticle = {
    id: "article-1",
    title: "Breaking News",
    description: "Something happened today",
    link: "https://example.com/news/1",
    createdAt: new Date("2026-05-15"),
    type: NEWS_ARTICLE as typeof NEWS_ARTICLE,
  };

  it("common.unit.news-model.001: NEWS_ARTICLE constant is 'NEWS_ARTICLE'", () => {
    expect(NEWS_ARTICLE).toBe("NEWS_ARTICLE");
  });

  it("common.unit.news-model.002: parses a valid news article", () => {
    const result = NewsArticleModelSchema.safeParse(validArticle);
    expect(result.success).toBe(true);
  });

  it("common.unit.news-model.003: rejects article with missing title", () => {
    const invalid = { ...validArticle, title: "" };
    const result = NewsArticleModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("common.unit.news-model.004: rejects article with missing description", () => {
    const invalid = { ...validArticle, description: "" };
    const result = NewsArticleModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("common.unit.news-model.005: rejects article with invalid link URL", () => {
    const invalid = { ...validArticle, link: "not-a-url" };
    const result = NewsArticleModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const linkError = result.error.issues.find((i) => i.path.includes("link"));
      expect(linkError).toBeDefined();
    }
  });

  it("common.unit.news-model.006: rejects article with wrong type literal", () => {
    const invalid = { ...validArticle, type: "WRONG_TYPE" };
    const result = NewsArticleModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("common.unit.news-model.007: rejects article with non-date createdAt", () => {
    const invalid = { ...validArticle, createdAt: "not-a-date" };
    const result = NewsArticleModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("common.unit.news-model.008: rejects article with whitespace-only title (refineFromEmpty)", () => {
    const invalid = { ...validArticle, title: "   " };
    const result = NewsArticleModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
