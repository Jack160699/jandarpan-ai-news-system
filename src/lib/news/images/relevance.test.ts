import { describe, expect, it } from "vitest";
import {
  isCuratedEditorialImageRelevant,
  safeguardUnrelatedImageReuse,
} from "@/lib/news/images/relevance";
import { isRejectedImageUrl } from "@/lib/news/images/validate";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

function row(id: string, headline: string, image: string, eventId: string | null = null): GeneratedArticleRow {
  return {
    id,
    event_id: eventId,
    slug: id,
    headline,
    summary: headline,
    article_body: headline,
    hero_image_url: image,
    seo_title: headline,
    seo_description: headline,
    reading_time: "2",
    language: "en",
    tags: [],
    published_at: "2026-07-15T00:00:00.000Z",
    editorial_status: "approved",
    editorial_metadata: {},
    created_at: "2026-07-15T00:00:00.000Z",
  };
}

describe("article image relevance safeguards", () => {
  it("rejects one assigned image across unrelated stories", () => {
    const image = "https://images.example.com/luxury-pool.jpg?w=1200";
    const result = safeguardUnrelatedImageReuse([
      row("ai", "DeepMind launches a new AI research model", image),
      row("market", "Adani shares rise during market trading", `${image}&q=80`),
    ]);
    expect(result.rows[0]?.hero_image_url).toBe(image);
    expect(result.rows[1]?.hero_image_url).toBeNull();
    expect(result.rejectedArticleIds).toEqual(["market"]);
  });

  it("allows reuse for stories from the same clustered event", () => {
    const image = "https://images.example.com/assembly.jpg";
    const result = safeguardUnrelatedImageReuse([
      row("one", "Assembly budget session opens", image, "event-1"),
      row("two", "Assembly budget session live updates", image, "event-1"),
    ]);
    expect(result.rejectedArticleIds).toEqual([]);
    expect(result.rows[1]?.hero_image_url).toBe(image);
  });

  it("allows local editorial assets and blocks private remote hosts", () => {
    expect(isRejectedImageUrl("/editorial/raipur-city.jpg").rejected).toBe(false);
    expect(isRejectedImageUrl("http://127.0.0.1/private.jpg").reason).toBe("private_host");
  });

  it("rejects a subject-mismatched historical editorial fallback", () => {
    expect(isCuratedEditorialImageRelevant("/editorial/steel-industry.jpg", {
      headline: "Raipur traffic remains smooth after the city advisory",
      category: "chhattisgarh",
      region: "Raipur",
    })).toBe(false);
    expect(isCuratedEditorialImageRelevant("/editorial/water-civic.jpg", {
      headline: "Raipur traffic remains smooth after monsoon rain",
      category: "chhattisgarh",
      region: "Raipur",
    })).toBe(true);
  });
});
