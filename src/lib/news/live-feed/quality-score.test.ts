import { describe, expect, it } from "vitest";
import { rankPoolByFeedQuality } from "@/lib/news/live-feed/quality-score";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function row(id: string, hoursAgo: number, over: Partial<GeneratedArticleRow> = {}): GeneratedArticleRow {
  return {
    id,
    event_id: null,
    slug: id,
    headline: `story ${id}`,
    summary: null,
    article_body: null,
    hero_image_url: null,
    seo_title: null,
    seo_description: null,
    reading_time: null,
    language: "en",
    tags: [],
    published_at: ago(hoursAgo),
    editorial_metadata: {},
    created_at: ago(hoursAgo),
    ...over,
  } as GeneratedArticleRow;
}

describe("rankPoolByFeedQuality", () => {
  it("never lets an older story outrank a newer freshness class on score alone", () => {
    // 3 days old, but image + CG keywords + trusted source + pin => very high score
    const loaded = row("old-loaded", 72, {
      headline: "रायपुर छत्तीसगढ़ chhattisgarh raipur बड़ी खबर",
      hero_image_url: "https://example.com/real.jpg",
      tags: ["chhattisgarh", "raipur"],
      homepage_pin: true,
    });
    const fresh = row("fresh-plain", 0.5);
    const ranked = rankPoolByFeedQuality([loaded, fresh], NOW);
    expect(ranked.map((r) => r.id)).toEqual(["fresh-plain", "old-loaded"]);
  });

  it("still ranks by score within the same freshness class", () => {
    const a = row("a", 0.4);
    const b = row("b", 0.6, { hero_image_url: "https://example.com/real.jpg", homepage_pin: true });
    const ranked = rankPoolByFeedQuality([a, b], NOW);
    expect(ranked[0]!.id).toBe("b");
  });
});
