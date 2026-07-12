import { describe, expect, it } from "vitest";
import type { HomeArticle } from "@/lib/homepage/types";
import { deriveHomeTrustSignals } from "./derive-home-trust";

function baseArticle(overrides: Partial<HomeArticle> = {}): HomeArticle {
  return {
    id: "1",
    slug: "test-story",
    headline: "Test",
    summary: "Summary",
    imageUrl: "/img.jpg",
    ogImageUrl: "/img.jpg",
    section: "chhattisgarh",
    readingTime: "3 min",
    publishedAt: "2026-07-12T10:00:00.000Z",
    isLive: false,
    urgency: "low",
    trendScore: 1,
    priorityScore: 1,
    ranking: {
      priorityScore: 1,
      reasons: [],
      isTrending: false,
      isBreaking: false,
      duplicateClusterId: null,
    },
    language: "hi",
    tags: [],
    aiConfidence: 0.9,
    sourceCount: 3,
    categoryLabel: "CG",
    desk: { id: "cg-ai-desk", name: "State Desk", nameHi: "राज्य डेस्क" },
    ...overrides,
  };
}

describe("deriveHomeTrustSignals", () => {
  it("does not infer human-reviewed from confidence alone", () => {
    const signals = deriveHomeTrustSignals(
      baseArticle({ editorialStatus: null, aiConfidence: 0.95, sourceCount: 4 })
    );
    expect(signals.some((s) => s.kind === "human-reviewed")).toBe(false);
  });

  it("shows human-reviewed only for approved editorial status", () => {
    const signals = deriveHomeTrustSignals(
      baseArticle({ editorialStatus: "approved" })
    );
    expect(signals.some((s) => s.kind === "human-reviewed")).toBe(true);
  });

  it("does not show verified from AI confidence alone", () => {
    const signals = deriveHomeTrustSignals(
      baseArticle({ aiConfidence: 0.99, editorialStatus: null })
    );
    expect(signals.some((s) => s.kind === "verified")).toBe(false);
  });

  it("omits source-count when sourceCount is zero", () => {
    const signals = deriveHomeTrustSignals(baseArticle({ sourceCount: 0 }));
    expect(signals.some((s) => s.kind === "source-count")).toBe(false);
  });

  it("shows live only for breaking-ranked stories", () => {
    const breaking = deriveHomeTrustSignals(
      baseArticle({
        ranking: {
          priorityScore: 1,
          reasons: [],
          isTrending: false,
          isBreaking: true,
          duplicateClusterId: null,
        },
      })
    );
    const calm = deriveHomeTrustSignals(baseArticle());
    expect(breaking.some((s) => s.kind === "live")).toBe(true);
    expect(calm.some((s) => s.kind === "live")).toBe(false);
  });
});
