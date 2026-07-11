import { describe, expect, it } from "vitest";
import { dedupeRowsByConflictKey } from "@/lib/news/pipeline/batch-dedupe";

describe("dedupeRowsByConflictKey", () => {
  it("removes duplicate article_url rows within a batch", () => {
    const result = dedupeRowsByConflictKey(
      [
        { article_url: "https://example.com/a?utm=1", title: "A1" },
        { article_url: "https://example.com/a", title: "A2" },
        { article_url: "https://example.com/b", title: "B" },
      ],
      {
        key: "article_url",
        canonicalize: (url) => url.replace("?utm=1", ""),
      }
    );

    expect(result.duplicateCount).toBe(1);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.article_url)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });

  it("keeps the richer row when duplicates conflict", () => {
    const result = dedupeRowsByConflictKey(
      [
        {
          article_url: "https://example.com/story",
          description: "short",
          published_at: "2026-01-01T00:00:00.000Z",
        },
        {
          article_url: "https://example.com/story",
          description: "much longer body",
          published_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      { key: "article_url" }
    );

    expect(result.duplicateCount).toBe(1);
    expect(result.rows[0]?.published_at).toBe("2026-01-02T00:00:00.000Z");
  });
});
