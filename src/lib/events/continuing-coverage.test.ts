import { describe, expect, it, vi } from "vitest";
import {
  buildContinuingCoverage,
  CONTINUING_COVERAGE_VISIBLE_LIMIT,
  continuingCoverageSlugs,
  STORY_STATUS_LABEL_HI,
} from "./continuing-coverage";
import type { EventClusterArticle } from "./fetch-event-cluster-articles";
import type { EventViewModel } from "./event-view-model";

vi.mock("@/lib/newsroom/logger", () => ({
  logNewsroom: vi.fn(),
}));

function article(
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

function baseEventVm(overrides: Partial<EventViewModel> = {}): EventViewModel {
  return {
    event_id: "evt-1",
    canonical_title: "रायपुर घटना",
    summary: null,
    status: "active",
    is_live: false,
    coverage_slug: "raipur-event",
    cluster_confidence: 0.8,
    region: "raipur",
    category: "local",
    signal_count: 2,
    tracked_since: "2026-07-01T00:00:00.000Z",
    latest_update: null,
    recent_updates: [],
    timeline: [],
    source_attribution: [],
    related_metadata: {},
    coverage_statistics: {
      update_count: 0,
      breaking_update_count: 0,
      signal_count: 0,
      source_count: 1,
      provider_count: 1,
      unique_source_count: 1,
      first_update_at: null,
      last_update_at: null,
      cluster_confidence_score: 0.8,
      cluster_confidence_label: "high",
    },
    ...overrides,
  };
}

describe("buildContinuingCoverage", () => {
  it("hides timeline for a one-story cluster", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "story-one",
          headline: "पहली खबर",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
      ],
      currentSlug: "story-one",
      eventViewModel: baseEventVm(),
    });

    expect(vm.showTimeline).toBe(false);
    expect(vm.items).toHaveLength(0);
    expect(continuingCoverageSlugs(vm).size).toBe(0);
  });

  it("shows timeline for a multi-story cluster", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "story-one",
          headline: "पहली खबर",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "a2",
          slug: "story-two",
          headline: "दूसरी खबर",
          published_at: "2026-07-21T10:00:00.000Z",
        }),
      ],
      currentSlug: "story-two",
      eventViewModel: baseEventVm(),
    });

    expect(vm.showTimeline).toBe(true);
    expect(vm.items).toHaveLength(2);
    expect(vm.eventTitle).toBe("रायपुर घटना");
  });

  it("orders chronologically and marks current + latest", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a2",
          slug: "later",
          headline: "बाद की खबर",
          published_at: "2026-07-22T12:00:00.000Z",
        }),
        article({
          id: "a1",
          slug: "earlier",
          headline: "पहले की खबर",
          published_at: "2026-07-20T12:00:00.000Z",
        }),
        article({
          id: "a3",
          slug: "middle",
          headline: "बीच की खबर",
          published_at: "2026-07-21T12:00:00.000Z",
        }),
      ],
      currentSlug: "middle",
    });

    expect(vm.items.map((i) => i.slug)).toEqual(["earlier", "middle", "later"]);
    expect(vm.items.find((i) => i.slug === "middle")?.isCurrent).toBe(true);
    expect(vm.items.find((i) => i.slug === "later")?.isLatest).toBe(true);
    expect(vm.nav.previous?.slug).toBe("earlier");
    expect(vm.nav.next?.slug).toBe("later");
    expect(vm.nav.latest?.slug).toBe("later");
  });

  it("prefers reliable event_at over published_at for ordering", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "published-first",
          headline: "प्रकाशित पहले",
          published_at: "2026-07-20T08:00:00.000Z",
          editorial_metadata: { event_at: "2026-07-21T18:00:00.000Z" } as never,
        }),
        article({
          id: "a2",
          slug: "published-later",
          headline: "प्रकाशित बाद",
          published_at: "2026-07-22T08:00:00.000Z",
          editorial_metadata: { event_at: "2026-07-20T09:00:00.000Z" } as never,
        }),
      ],
      currentSlug: "published-first",
    });

    // Event time puts published-later (event morning) before published-first (event evening).
    expect(vm.items.map((i) => i.slug)).toEqual([
      "published-later",
      "published-first",
    ]);
    expect(vm.items[0].usedEventTime).toBe(true);
    expect(vm.items[1].usedEventTime).toBe(true);
  });

  it("falls back to published_at when event time is missing", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "one",
          headline: "एक",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "a2",
          slug: "two",
          headline: "दो",
          published_at: "2026-07-21T10:00:00.000Z",
        }),
      ],
      currentSlug: "one",
    });

    expect(vm.items.every((i) => i.usedEventTime === false)).toBe(true);
    expect(vm.items.map((i) => i.sortAt)).toEqual([
      "2026-07-20T10:00:00.000Z",
      "2026-07-21T10:00:00.000Z",
    ]);
  });

  it("suppresses near-duplicate updates", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "dup-a",
          headline: "रायपुर में भारी बारिश से जलभराव",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "a2",
          slug: "dup-b",
          headline: "रायपुर में भारी बारिश से जलभराव!",
          published_at: "2026-07-20T11:00:00.000Z",
        }),
        article({
          id: "a3",
          slug: "distinct",
          headline: "जलभराव के बाद राहत कार्य शुरू",
          published_at: "2026-07-21T10:00:00.000Z",
        }),
      ],
      currentSlug: "distinct",
    });

    expect(vm.items).toHaveLength(2);
    expect(vm.items.map((i) => i.slug)).toEqual(["dup-a", "distinct"]);
  });

  it("excludes unrelated stories from a different event", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "same-event-a",
          headline: "घटना एक",
          published_at: "2026-07-20T10:00:00.000Z",
          event_id: "evt-1",
        }),
        article({
          id: "a2",
          slug: "same-event-b",
          headline: "घटना दो",
          published_at: "2026-07-21T10:00:00.000Z",
          event_id: "evt-1",
        }),
        article({
          id: "a3",
          slug: "other-event",
          headline: "अन्य घटना",
          published_at: "2026-07-21T12:00:00.000Z",
          event_id: "evt-other",
        }),
      ],
      currentSlug: "same-event-a",
    });

    expect(vm.items.map((i) => i.slug)).toEqual([
      "same-event-a",
      "same-event-b",
    ]);
  });

  it("collapses older items on long timelines", () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      article({
        id: `a${i}`,
        slug: `story-${i}`,
        headline: `अपडेट ${i}`,
        published_at: `2026-07-${String(10 + i).padStart(2, "0")}T10:00:00.000Z`,
      })
    );

    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles,
      currentSlug: "story-7",
      visibleLimit: CONTINUING_COVERAGE_VISIBLE_LIMIT,
    });

    expect(vm.items).toHaveLength(8);
    expect(vm.visibleItems).toHaveLength(CONTINUING_COVERAGE_VISIBLE_LIMIT);
    expect(vm.collapsedCount).toBe(8 - CONTINUING_COVERAGE_VISIBLE_LIMIT);
    expect(vm.visibleItems.some((i) => i.isCurrent)).toBe(true);
    expect(vm.visibleItems.some((i) => i.isLatest)).toBe(true);
  });

  it("keeps current story visible when it is older than the default window", () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      article({
        id: `a${i}`,
        slug: `story-${i}`,
        headline: `अपडेट ${i}`,
        published_at: `2026-07-${String(10 + i).padStart(2, "0")}T10:00:00.000Z`,
      })
    );

    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles,
      currentSlug: "story-1",
      visibleLimit: 5,
    });

    expect(vm.visibleItems.some((i) => i.slug === "story-1" && i.isCurrent)).toBe(
      true
    );
    expect(vm.visibleItems.some((i) => i.isLatest)).toBe(true);
  });

  it("uses Hindi status labels with evidence-backed types", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "first",
          headline: "पूरी खबर",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "a2",
          slug: "breaking",
          headline: "ब्रेकिंग अपडेट",
          published_at: "2026-07-21T10:00:00.000Z",
          tags: ["breaking"],
          editorial_metadata: { is_breaking: true },
        }),
      ],
      currentSlug: "breaking",
      eventViewModel: baseEventVm({ is_live: true, status: "live" }),
    });

    expect(vm.items[0].statusLabelHi).toBe(STORY_STATUS_LABEL_HI.full);
    expect(vm.items[1].statusLabelHi).toBe(STORY_STATUS_LABEL_HI.breaking);
    expect(vm.clusterStatus).toBe("ongoing");
    expect(vm.nav.overviewHref).toBe("/live/raipur-event");
  });

  it("does not invent ongoing/live status without evidence", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "one",
          headline: "एक",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "a2",
          slug: "two",
          headline: "दो",
          published_at: "2026-07-21T10:00:00.000Z",
        }),
      ],
      currentSlug: "two",
      eventViewModel: baseEventVm({ is_live: false, status: "" }),
    });

    expect(vm.clusterStatus).toBe("unknown");
    expect(vm.items[1].updateType).not.toBe("ongoing");
  });

  it("returns valid story hrefs", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "alpha",
          headline: "अल्फा",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "a2",
          slug: "beta",
          headline: "बीटा",
          published_at: "2026-07-21T10:00:00.000Z",
        }),
      ],
      currentSlug: "alpha",
    });

    for (const item of vm.items) {
      expect(item.href).toBe(`/story/${item.slug}`);
      expect(item.href.startsWith("/story/")).toBe(true);
    }
  });

  it("hides timeline when event id is missing", () => {
    const vm = buildContinuingCoverage({
      eventId: null,
      articles: [
        article({
          id: "a1",
          slug: "one",
          headline: "एक",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "a2",
          slug: "two",
          headline: "दो",
          published_at: "2026-07-21T10:00:00.000Z",
        }),
      ],
      currentSlug: "one",
    });

    expect(vm.showTimeline).toBe(false);
  });
});

describe("continuingCoverageSlugs", () => {
  it("exposes timeline slugs for related-block de-duplication", () => {
    const vm = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "one",
          headline: "एक",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "a2",
          slug: "two",
          headline: "दो",
          published_at: "2026-07-21T10:00:00.000Z",
        }),
      ],
      currentSlug: "one",
    });

    expect([...continuingCoverageSlugs(vm)].sort()).toEqual(["one", "two"]);
  });
});
