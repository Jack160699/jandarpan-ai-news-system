import { describe, expect, it } from "vitest";
import { selectDiverseTopTen } from "@/lib/listen/top-ten";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import type { HomeSectionId } from "@/lib/homepage/types";

function short(id: string, section: HomeSectionId): NewsShortCard {
  return {
    articleId: id,
    slug: id,
    headline: `Story ${id}`,
    summary60s: "Summary",
    anchorLine: "Anchor",
    imageUrl: "/editorial/newsroom-desk.jpg",
    videoUrl: null,
    section,
    styleId: "default",
    durationSec: 45,
    highlights: [],
    hasVoice: false,
    voiceStreamPath: `/api/shorts/voice/${id}`,
    publishedAt: "2026-07-15T00:00:00.000Z",
    language: "en",
    subtitles: [],
    reelSlides: [],
    categoryLabel: section,
    sourceLabel: "Jan Darpan Desk",
    sourceCount: 1,
    isLive: false,
  };
}

describe("selectDiverseTopTen", () => {
  it("preserves rank while limiting early category domination", () => {
    const ranked = [
      short("a", "business"),
      short("b", "business"),
      short("c", "business"),
      short("d", "sports"),
      short("e", "india"),
      short("f", "world"),
    ];
    expect(selectDiverseTopTen(ranked, 5).map((story) => story.articleId)).toEqual([
      "a",
      "b",
      "d",
      "e",
      "f",
    ]);
  });

  it("deduplicates article ids and fills from the ranked pool", () => {
    const ranked = [
      short("a", "sports"),
      short("a", "sports"),
      short("b", "sports"),
      short("c", "sports"),
    ];
    expect(selectDiverseTopTen(ranked)).toHaveLength(3);
  });
});
