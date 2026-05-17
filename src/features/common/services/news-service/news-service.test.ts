import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetchAll = vi.fn();
const mockQuery = vi.fn(() => ({ fetchAll: mockFetchAll }));

vi.mock("@/features/common/services/cosmos", () => ({
  ConfigContainer: vi.fn(() => ({
    items: { query: mockQuery },
  })),
}));

describe("common.unit.news-service — FindAllNewsArticles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("common.unit.news-service.001: returns OK with articles when Cosmos returns resources", async () => {
    const articles = [
      {
        id: "a1",
        title: "Article One",
        description: "Description one",
        link: "https://example.com/1",
        createdAt: new Date().toISOString(),
        type: "NEWS_ARTICLE",
      },
    ];
    mockFetchAll.mockResolvedValue({ resources: articles });

    const { FindAllNewsArticles } = await import("./news-service");
    const result = await FindAllNewsArticles();
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.response).toHaveLength(1);
      expect(result.response[0].id).toBe("a1");
    }
  });

  it("common.unit.news-service.002: returns ERROR when resources is falsy", async () => {
    mockFetchAll.mockResolvedValue({ resources: null });

    const { FindAllNewsArticles } = await import("./news-service");
    const result = await FindAllNewsArticles();
    expect(result.status).toBe("ERROR");
    if (result.status === "ERROR") {
      expect(result.errors[0].message).toContain("No news found");
    }
  });

  it("common.unit.news-service.003: returns ERROR when Cosmos throws", async () => {
    mockFetchAll.mockRejectedValue(new Error("Cosmos timeout"));

    const { FindAllNewsArticles } = await import("./news-service");
    const result = await FindAllNewsArticles();
    expect(result.status).toBe("ERROR");
    if (result.status === "ERROR") {
      expect(result.errors[0].message).toContain("Cosmos timeout");
    }
  });

  it("common.unit.news-service.004: queries with NEWS_ARTICLE type filter", async () => {
    mockFetchAll.mockResolvedValue({ resources: [] });

    const { FindAllNewsArticles } = await import("./news-service");
    await FindAllNewsArticles();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.arrayContaining([
          expect.objectContaining({ name: "@type", value: "NEWS_ARTICLE" }),
        ]),
      })
    );
  });
});
