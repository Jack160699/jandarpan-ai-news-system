import { describe, expect, it } from "vitest";
import {
  pickRelatedStories,
  scoreRelatedness,
} from "@/lib/news/related-stories";
import type { NewsArticleRow } from "@/lib/types/news-article";

function article(
  partial: Partial<NewsArticleRow> & Pick<NewsArticleRow, "id" | "title">
): NewsArticleRow {
  return {
    description: null,
    content: null,
    image_url: null,
    source: null,
    author: null,
    category: "local",
    article_url: `https://example.com/${partial.id}`,
    slug: String(partial.id),
    published_at: "2026-07-20T10:00:00.000Z",
    created_at: "2026-07-20T10:00:00.000Z",
    updated_at: "2026-07-20T10:00:00.000Z",
    language: "hi",
    region: "chhattisgarh",
    title_hash: null,
    url_hash: null,
    ai_summary: null,
    ai_headline: null,
    ai_processed_at: null,
    event_id: null,
    ...partial,
  };
}

describe("related stories ranking", () => {
  it("prefers same-event siblings over category-only matches", () => {
    const source = article({
      id: 1,
      title: "दुर्ग में घटना — पहली रिपोर्ट",
      event_id: "evt-1",
      category: "local",
    });
    const sameEvent = article({
      id: 2,
      title: "दुर्ग घटना — नया अपडेट",
      event_id: "evt-1",
      category: "politics",
    });
    const sameCategory = article({
      id: 3,
      title: "अन्य स्थानीय खबर",
      event_id: "evt-9",
      category: "local",
    });

    expect(scoreRelatedness(source, sameEvent)).toBeGreaterThan(
      scoreRelatedness(source, sameCategory)
    );

    const picked = pickRelatedStories(source, [sameCategory, sameEvent], 3);
    expect(picked[0]?.id).toBe(2);
  });

  it("dedupes by id and canonical URL and never returns the source", () => {
    const source = article({
      id: 1,
      title: "मूल खबर",
      article_url: "https://example.com/canonical",
    });
    const dupUrl = article({
      id: 2,
      title: "अलग शीर्षक",
      article_url: "https://example.com/canonical",
      category: "local",
    });
    const ok = article({
      id: 3,
      title: "संबंधित रिपोर्ट",
      category: "local",
      description: "मूल खबर से जुड़े तथ्य",
    });

    const picked = pickRelatedStories(source, [source, dupUrl, ok], 6);
    expect(picked.map((p) => p.id)).toEqual([3]);
  });
});
