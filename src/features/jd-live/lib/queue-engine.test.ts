import { describe, it, expect } from "vitest";
import {
  computeCanonicalQueue,
  selectNextPlayableStory,
  getValidTimestamp,
  comparePublishedDesc,
} from "./queue-engine";
import type { BroadcastSegment } from "../types";

const BASE_NOW = new Date("2026-09-27T12:00:00Z").getTime();

function mockStory(
  id: string,
  publishedAt: string,
  overrides: Partial<BroadcastSegment> = {}
): BroadcastSegment {
  return {
    id,
    slug: `story-${id}`,
    headline: `Headline for ${id}`,
    summary: `Summary for ${id}`,
    script: `Narration script for story ${id}`,
    imageUrl: "https://images.jandarpan.news/media-sample.jpg",
    district: "Raipur",
    districtSlug: "raipur",
    section: "chhattisgarh",
    isBreaking: false,
    isLive: false,
    priorityScore: 0,
    categoryLabel: "राज्य डेस्क",
    canonicalCategories: ["chhattisgarh"],
    publishedAt,
    durationSec: 15,
    countdownRank: 0,
    isIntro: false,
    ...overrides,
  } as BroadcastSegment;
}

describe("queue-engine", () => {
  describe("getValidTimestamp", () => {
    it("returns correct timestamp for ISO string", () => {
      const ts = getValidTimestamp("2026-09-27T10:00:00Z");
      expect(ts).toBe(new Date("2026-09-27T10:00:00Z").getTime());
    });

    it("never substitutes createdAt for a missing publishedAt (published_at is the only event time)", () => {
      expect(getValidTimestamp(null, "2026-09-27T08:00:00Z")).toBe(0);
      expect(getValidTimestamp(undefined, "2026-09-27T08:00:00Z")).toBe(0);
    });

    it("never returns NaN for invalid input", () => {
      expect(getValidTimestamp("invalid-date", "another-invalid")).toBe(0);
      expect(getValidTimestamp(undefined, undefined)).toBe(0);
    });
  });

  describe("computeCanonicalQueue", () => {
    it("Acceptance Test A: Orders unconsumed stories strictly by published_at DESC", () => {
      const stories = [
        mockStory("E", "2026-09-27T09:20:00Z"),
        mockStory("A", "2026-09-27T10:00:00Z"),
        mockStory("C", "2026-09-27T09:40:00Z"),
        mockStory("D", "2026-09-27T09:30:00Z"),
        mockStory("B", "2026-09-27T09:50:00Z"),
      ];

      const res = computeCanonicalQueue({
        rawStories: stories,
        consumedIds: new Set(),
        nowMs: BASE_NOW,
      });

      expect(res.queue.map((s) => s.id)).toEqual(["A", "B", "C", "D", "E"]);
      expect(res.unconsumedCount).toBe(5);
      expect(res.consumedCount).toBe(0);
    });

    it("Acceptance Test B & 6: Exact Required Ordering (A unread, B consumed, C unread, D unread, E consumed -> A, C, D, B, E)", () => {
      const stories = [
        mockStory("A", "2026-09-27T11:00:00Z"),
        mockStory("B", "2026-09-27T10:55:00Z"),
        mockStory("C", "2026-09-27T10:50:00Z"),
        mockStory("D", "2026-09-27T10:40:00Z"),
        mockStory("E", "2026-09-27T10:30:00Z"),
      ];

      const consumedIds = new Set(["B", "E"]);

      const res = computeCanonicalQueue({
        rawStories: stories,
        consumedIds,
        nowMs: BASE_NOW,
      });

      expect(res.queue.map((s) => s.id)).toEqual(["A", "C", "D", "B", "E"]);
      expect(res.unconsumedCount).toBe(3);
      expect(res.consumedCount).toBe(2);
    });

    it("Acceptance Test E: New evening stories play first, morning consumed remain at bottom", () => {
      // User consumed A-D in the morning
      const morningConsumed = [
        mockStory("A", "2026-09-27T06:00:00Z"),
        mockStory("B", "2026-09-27T06:30:00Z"),
        mockStory("C", "2026-09-27T07:00:00Z"),
        mockStory("D", "2026-09-27T07:30:00Z"),
      ];
      // Afternoon stories arrive
      const afternoonNew = [
        mockStory("E", "2026-09-27T09:00:00Z"),
        mockStory("F", "2026-09-27T10:00:00Z"),
        mockStory("G", "2026-09-27T11:00:00Z"),
      ];

      const consumedIds = new Set(["A", "B", "C", "D"]);

      const res = computeCanonicalQueue({
        rawStories: [...morningConsumed, ...afternoonNew],
        consumedIds,
        nowMs: BASE_NOW,
      });

      // Expected: G -> F -> E (unconsumed, newest to oldest) followed by D -> C -> B -> A (consumed, newest to oldest)
      expect(res.queue.map((s) => s.id)).toEqual(["G", "F", "E", "D", "C", "B", "A"]);
    });

    it("Rejects stories older than 30-day canonical rolling window", () => {
      const freshStory = mockStory("fresh", "2026-09-25T10:00:00Z");
      const oldStory = mockStory("too-old", "2026-08-15T10:00:00Z"); // > 40 days old

      const res = computeCanonicalQueue({
        rawStories: [freshStory, oldStory],
        consumedIds: new Set(),
        nowMs: BASE_NOW,
      });

      expect(res.queue.map((s) => s.id)).toEqual(["fresh"]);
    });

    it("Rejects generic roundups from queue", () => {
      const legitStory = mockStory("legit", "2026-09-27T10:00:00Z", {
        headline: "रायपुर में नई सड़क परियोजना को मिली प्रशासनिक मंजूरी",
      });
      const genericRoundup = mockStory("roundup", "2026-09-27T11:00:00Z", {
        headline: "देश और दुनिया के ताजा समाचारों का लाइव अपडेट जारी, पढ़ें प्रमुख खबरें",
      });

      const res = computeCanonicalQueue({
        rawStories: [legitStory, genericRoundup],
        consumedIds: new Set(),
        nowMs: BASE_NOW,
      });

      expect(res.queue.map((s) => s.id)).toEqual(["legit"]);
    });

    it("Deduplicates identical events by slug and keeping the newer one", () => {
      const storyV1 = mockStory("v1", "2026-09-27T09:00:00Z", { slug: "bridge-collapse-durg" });
      const storyV2 = mockStory("v2", "2026-09-27T10:00:00Z", { slug: "bridge-collapse-durg" });

      const res = computeCanonicalQueue({
        rawStories: [storyV1, storyV2],
        consumedIds: new Set(),
        nowMs: BASE_NOW,
      });

      expect(res.queue.length).toBe(1);
    });
  });

  describe("timestamp eligibility", () => {
    it("rejects a story with no published_at instead of letting it into the timeline", () => {
      const { queue } = computeCanonicalQueue({
        rawStories: [mockStory("ok", "2026-09-27T10:00:00Z"), mockStory("nil", "", { publishedAt: undefined as unknown as string })],
        nowMs: BASE_NOW,
      });
      expect(queue.map((s) => s.id)).toEqual(["ok"]);
    });

    it("rejects a far-future timestamp (bad data is not 'newest') but tolerates small clock skew", () => {
      const { queue } = computeCanonicalQueue({
        rawStories: [
          mockStory("future", "2026-09-30T12:00:00Z"),
          mockStory("skew", "2026-09-27T12:30:00Z"),
          mockStory("ok", "2026-09-27T10:00:00Z"),
        ],
        nowMs: BASE_NOW,
      });
      expect(queue.map((s) => s.id)).toEqual(["skew", "ok"]);
    });

    it("a fresh session (nothing consumed) starts with the newest eligible story", () => {
      const { queue } = computeCanonicalQueue({
        rawStories: [mockStory("a", "2026-09-27T01:00:00Z"), mockStory("b", "2026-09-27T11:00:00Z"), mockStory("c", "2026-09-27T06:00:00Z")],
        nowMs: BASE_NOW,
      });
      expect(queue[0]!.id).toBe("b");
    });
  });

  describe("selectNextPlayableStory", () => {
    it("Acceptance Test C: Selects the next unconsumed eligible story when A completes", () => {
      const stories = [
        mockStory("A", "2026-09-27T11:00:00Z"),
        mockStory("B", "2026-09-27T10:50:00Z"),
        mockStory("C", "2026-09-27T10:40:00Z"),
      ];

      // A was just consumed
      const consumedIds = new Set(["A"]);
      const { queue } = computeCanonicalQueue({ rawStories: stories, consumedIds, nowMs: BASE_NOW });

      const next = selectNextPlayableStory({
        queue,
        consumedIds,
        activeStoryId: "A",
      });

      expect(next?.id).toBe("B");
    });

    it("Acceptance Test G: If new story Z arrived during playback of A, Z is next after A finishes", () => {
      const stories = [
        mockStory("A", "2026-09-27T11:00:00Z"),
        mockStory("B", "2026-09-27T10:50:00Z"),
        mockStory("Z", "2026-09-27T11:15:00Z"), // Z is newer than A and arrived during playback
      ];

      // A completes
      const consumedIds = new Set(["A"]);
      const { queue } = computeCanonicalQueue({ rawStories: stories, consumedIds, nowMs: BASE_NOW });

      const next = selectNextPlayableStory({
        queue,
        consumedIds,
        activeStoryId: "A",
      });

      expect(next?.id).toBe("Z");
    });

    it("Acceptance Test D: Multiple consumptions A, B, C move to end: D -> E -> ... -> A -> B -> C", () => {
      const stories = [
        mockStory("A", "2026-09-27T11:00:00Z"),
        mockStory("B", "2026-09-27T10:50:00Z"),
        mockStory("C", "2026-09-27T10:40:00Z"),
        mockStory("D", "2026-09-27T10:30:00Z"),
        mockStory("E", "2026-09-27T10:20:00Z"),
      ];

      const consumedIds = new Set(["A", "B", "C"]);
      const res = computeCanonicalQueue({
        rawStories: stories,
        consumedIds,
        nowMs: BASE_NOW,
      });

      expect(res.queue.map((s) => s.id)).toEqual(["D", "E", "A", "B", "C"]);
      expect(res.unconsumedCount).toBe(2);
      expect(res.consumedCount).toBe(3);
    });

    it("Acceptance Test N: Rejects stories with location integrity conflicts (external city + false CG district tag)", () => {
      // This story claims to be from Raipur but is actually about Amritsar, Punjab
      const conflictStory = mockStory("conflict", "2026-09-27T10:00:00Z", {
        headline: "अमृतसर में नया हाईवे — पंजाब सरकार की बड़ी घोषणा",
        summary: "अमृतसर और जालंधर के बीच नए हाईवे का काम शुरू किया गया। पंजाब सरकार ने बजट आवंटित किया।",
        district: "Raipur",
        districtSlug: "raipur",
        section: "india",
        canonicalCategories: ["india"],
      });

      const res = computeCanonicalQueue({
        rawStories: [conflictStory],
        consumedIds: new Set(),
        nowMs: BASE_NOW,
      });

      // Should be rejected: headline is about Amritsar+Punjab but tagged as Raipur district
      expect(res.queue.length).toBe(0);
    });

    it("Acceptance Test J: Falls back to consumed stories if all stories are consumed", () => {
      const stories = [
        mockStory("A", "2026-09-27T11:00:00Z"),
        mockStory("B", "2026-09-27T10:50:00Z"),
      ];

      const consumedIds = new Set(["A", "B"]);
      const { queue } = computeCanonicalQueue({ rawStories: stories, consumedIds, nowMs: BASE_NOW });

      // When A finishes, and all are consumed, select B
      const next = selectNextPlayableStory({
        queue,
        consumedIds,
        activeStoryId: "A",
      });

      expect(next?.id).toBe("B");
    });
  });
});
