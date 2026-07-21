import { describe, expect, it } from "vitest";
import { mapShortsToAudioTracks } from "./map-tracks";
import type { NewsShortCard } from "@/lib/news/shorts/types";

function short(overrides: Partial<NewsShortCard> = {}): NewsShortCard {
  return {
    articleId: "a1",
    slug: "bilaspur-news",
    headline: "बिलासपुर समाचार",
    summary60s: "सार",
    anchorLine: "लाइन",
    imageUrl: "/i.jpg",
    section: "chhattisgarh",
    styleId: "default",
    durationSec: 40,
    highlights: [],
    hasVoice: false,
    voiceStreamPath: "/api/shorts/voice/bilaspur-news",
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

describe("mapShortsToAudioTracks", () => {
  it("preserves voice streamPath for real playback wiring", () => {
    const tracks = mapShortsToAudioTracks([short()]);
    expect(tracks[0]?.streamPath).toBe("/api/shorts/voice/bilaspur-news");
    expect(tracks[0]?.voiceStatus).toBe("pending");
  });
});
