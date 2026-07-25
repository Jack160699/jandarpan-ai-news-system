import { describe, expect, it } from "vitest";
import { buildReaderArticleModel } from "./buildArticleModel";
import { buildContinuingCoverage } from "@/lib/events/continuing-coverage";
import type { EventClusterArticle } from "@/lib/events/fetch-event-cluster-articles";
import type { NewsArticleRow } from "@/lib/types/news-article";

function newsArticle(
  partial: Partial<NewsArticleRow> & Pick<NewsArticleRow, "id" | "title">
): NewsArticleRow {
  const slug = partial.slug ?? String(partial.id);
  return {
    description: null,
    content: null,
    image_url: null,
    category: "local",
    region: "raipur",
    source: "desk",
    published_at: "2026-07-20T10:00:00.000Z",
    author: null,
    article_url: `https://example.com/${slug}`,
    slug,
    created_at: "2026-07-20T10:00:00.000Z",
    updated_at: "2026-07-20T10:00:00.000Z",
    language: "hi",
    title_hash: null,
    url_hash: null,
    ai_summary: null,
    ai_headline: null,
    ai_processed_at: null,
    ...partial,
  };
}

function clusterArticle(
  partial: Partial<EventClusterArticle> &
    Pick<EventClusterArticle, "id" | "slug" | "headline" | "published_at">
): EventClusterArticle {
  return {
    event_id: "evt-1",
    summary: null,
    editorial_metadata: {},
    geo_metadata: null,
    tags: [],
    language: "hi",
    created_at: partial.published_at,
    ...partial,
  };
}

describe("buildReaderArticleModel continuing coverage", () => {
  it("attaches timeline and strips duplicate related cards", () => {
    const coverage = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        clusterArticle({
          id: "a1",
          slug: "timeline-a",
          headline: "घटनाक्रम एक",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        clusterArticle({
          id: "a2",
          slug: "timeline-b",
          headline: "घटनाक्रम दो",
          published_at: "2026-07-21T10:00:00.000Z",
        }),
      ],
      currentSlug: "timeline-a",
    });

    const model = buildReaderArticleModel({
      article: newsArticle({
        id: 1,
        title: "घटनाक्रम एक",
        slug: "timeline-a",
      }),
      paragraphs: ["पैरा एक।"],
      related: [
        newsArticle({
          id: 2,
          title: "घटनाक्रम दो",
          slug: "timeline-b",
        }),
        newsArticle({
          id: 3,
          title: "पृष्ठभूमि खबर",
          slug: "background-story",
        }),
      ],
      continuingCoverage: coverage,
    });

    expect(model.continuingCoverage?.showTimeline).toBe(true);
    expect(model.related.map((r) => r.slug)).toEqual(["background-story"]);
  });

  it("keeps ordinary related content when timeline is hidden", () => {
    const coverage = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        clusterArticle({
          id: "a1",
          slug: "only-one",
          headline: "अकेली खबर",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
      ],
      currentSlug: "only-one",
    });

    const model = buildReaderArticleModel({
      article: newsArticle({
        id: 1,
        title: "अकेली खबर",
        slug: "only-one",
      }),
      paragraphs: ["पैरा।"],
      related: [
        newsArticle({
          id: 9,
          title: "संबंधित",
          slug: "related-one",
        }),
      ],
      continuingCoverage: coverage,
    });

    expect(model.continuingCoverage).toBeNull();
    expect(model.related.map((r) => r.slug)).toEqual(["related-one"]);
  });
});
