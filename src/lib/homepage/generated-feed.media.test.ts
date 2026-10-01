import { describe, expect, it } from "vitest";
import { toHomeArticle } from "@/lib/homepage/generated-feed";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const REAL = "https://images.jandarpan.news/stories/2026/10/editorial-photo-1.jpg";

function row(over: Partial<GeneratedArticleRow> = {}): GeneratedArticleRow {
  return {
    id: "a1",
    event_id: "e1",
    slug: "chhattisgarh-police-headquarters-issues-transfer-orders-a1",
    headline: "Chhattisgarh Police Headquarters Issues Transfer Orders for Inspectors",
    summary: "Orders for the simultaneous transfer of inspectors have been issued.",
    article_body: "Body paragraph one.\n\nBody paragraph two.",
    hero_image_url: null,
    seo_title: null,
    seo_description: null,
    reading_time: "3 min",
    language: "en",
    tags: ["chhattisgarh"],
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    editorial_metadata: {},
    editorial_status: "approved",
    geo_metadata: { scope: "STATEWIDE_CHHATTISGARH", is_chhattisgarh: true },
    translations: null,
    ...over,
  } as unknown as GeneratedArticleRow;
}

describe("toHomeArticle: media is a display rule, never a visibility rule", () => {
  it("a valid article with NO image still renders (text-first card)", () => {
    const a = toHomeArticle(row({ hero_image_url: null }), undefined, "en");
    expect(a).not.toBeNull();
    expect(a!.headline).toContain("Chhattisgarh Police");
    expect(a!.imageUrl).toBe("");
  });

  it("a valid article whose image provider was unavailable (editorial_metadata image decision C) still renders", () => {
    const a = toHomeArticle(
      row({ editorial_metadata: { image: { status: "completed", decision: "C", decision_reason: "provider_unavailable", hero_url: null } } as never }),
      undefined,
      "en",
    );
    expect(a).not.toBeNull();
    expect(a!.imageUrl).toBe("");
  });

  it("generic stock (Unsplash) is NEVER presented as real media - the article renders without it", () => {
    const a = toHomeArticle(row({ hero_image_url: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200" }), undefined, "en");
    expect(a).not.toBeNull();
    expect(a!.imageUrl).toBe("");
    expect(a!.ogImageUrl).toBe("");
  });

  it("placeholder / fake URLs are not presented as real media either", () => {
    for (const bad of ["/placeholder.svg", "https://example.com/placeholder-avatar.png", "   "]) {
      const a = toHomeArticle(row({ hero_image_url: bad }), undefined, "en");
      expect(a).not.toBeNull();
      expect(a!.imageUrl).toBe("");
    }
  });

  it("a verified real source image is still shown normally", () => {
    const a = toHomeArticle(row({ hero_image_url: REAL }), undefined, "en");
    expect(a).not.toBeNull();
    expect(a!.imageUrl).toContain("jandarpan.news");
  });

  it("an article with no usable headline for the reader language is still not rendered (language rules untouched)", () => {
    const a = toHomeArticle(row({ headline: "   " }), undefined, "en");
    expect(a).toBeNull();
  });
});
