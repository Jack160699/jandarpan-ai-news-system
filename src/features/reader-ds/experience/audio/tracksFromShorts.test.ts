import { describe, expect, it } from "vitest";
import {
  briefingMeta,
  tracksFromArticles,
  tracksFromShorts,
} from "./tracksFromShorts";
import { trackHasPlayableSource } from "./types";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import type { HomeArticle } from "@/lib/homepage/types";

function short(overrides: Partial<NewsShortCard> = {}): NewsShortCard {
  return {
    articleId: "a1",
    slug: "raipur-update",
    headline: "रायपुर अपडेट",
    summary60s: "संक्षेप",
    anchorLine: "लाइव",
    imageUrl: "/img.jpg",
    section: "chhattisgarh",
    styleId: "default",
    durationSec: 58,
    highlights: [],
    hasVoice: false,
    voiceStreamPath: "/api/shorts/voice/raipur-update",
    publishedAt: new Date().toISOString(),
    language: "hi",
    subtitles: [],
    reelSlides: [],
    categoryLabel: "राज्य",
    sourceLabel: "जनदर्पण",
    sourceCount: 1,
    isLive: false,
    ...overrides,
  };
}

function article(): HomeArticle {
  return {
    id: "1",
    slug: "x",
    headline: "शीर्षक",
    summary: "सार",
    imageUrl: "",
    ogImageUrl: "",
    section: "chhattisgarh",
    readingTime: "2 मिनट",
    publishedAt: new Date().toISOString(),
    isLive: false,
    urgency: "low",
    trendScore: 0,
    priorityScore: 0,
    ranking: {
      priorityScore: 0,
      reasons: [],
      isTrending: false,
      isBreaking: false,
      duplicateClusterId: null,
    },
    language: "hi",
    tags: [],
    aiConfidence: 1,
    sourceCount: 1,
    categoryLabel: "राज्य",
    desk: { id: "cg-ai-desk", name: "State Desk", nameHi: "राज्य डेस्क" },
  } as HomeArticle;
}

describe("tracksFromShorts", () => {
  it("attaches streamPath even when hasVoice is false (pending TTS)", () => {
    const tracks = tracksFromShorts([short({ hasVoice: false })]);
    expect(tracks[0]?.streamPath).toBe("/api/shorts/voice/raipur-update");
    expect(tracks[0]?.voiceStatus).toBe("pending");
    expect(trackHasPlayableSource(tracks[0])).toBe(true);
  });

  it("marks ready when hasVoice is true", () => {
    const tracks = tracksFromShorts([short({ hasVoice: true })]);
    expect(tracks[0]?.voiceStatus).toBe("ready");
  });

  it("marks unavailable when voice path missing", () => {
    const tracks = tracksFromShorts([
      short({ voiceStreamPath: "", hasVoice: false }),
    ]);
    expect(tracks[0]?.streamPath).toBeNull();
    expect(tracks[0]?.voiceStatus).toBe("unavailable");
    expect(trackHasPlayableSource(tracks[0])).toBe(false);
  });
});

describe("tracksFromArticles", () => {
  it("does not invent playable audio for homepage fallbacks", () => {
    const tracks = tracksFromArticles([article()]);
    expect(tracks[0]?.streamPath).toBeNull();
    expect(tracks[0]?.voiceStatus).toBe("unavailable");
    expect(briefingMeta(tracks).playableCount).toBe(0);
  });
});
