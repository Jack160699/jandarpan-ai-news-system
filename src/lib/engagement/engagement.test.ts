import { describe, expect, it } from "vitest";
import { buildDailyDarpan } from "@/lib/engagement/daily-darpan";
import { classifyStoryFormat } from "@/lib/engagement/story-format";
import { resolveDayPart, getDayPartCopy } from "@/lib/engagement/time-of-day";
import { buildWhatChanged } from "@/lib/engagement/what-changed";
import { pickDevelopingStory } from "@/lib/engagement/pick-developing";
import { buildLocalPulse } from "@/lib/engagement/local-pulse";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import type { ContinuingCoverageVm } from "@/lib/events/continuing-coverage";

function article(partial: Partial<HomeArticle> & Pick<HomeArticle, "slug" | "headline">): HomeArticle {
  return {
    id: partial.id ?? partial.slug,
    slug: partial.slug,
    headline: partial.headline,
    summary: partial.summary ?? "Summary for briefing quality gate content here.",
    imageUrl: partial.imageUrl ?? "https://example.com/a.jpg",
    ogImageUrl: partial.ogImageUrl ?? "",
    section: partial.section ?? "chhattisgarh",
    readingTime: "3 min",
    publishedAt: partial.publishedAt ?? new Date().toISOString(),
    isLive: partial.isLive ?? false,
    urgency: partial.urgency ?? "medium",
    trendScore: partial.trendScore ?? 10,
    priorityScore: partial.priorityScore ?? 10,
    ranking: partial.ranking ?? {
      priorityScore: partial.priorityScore ?? 10,
      reasons: [],
      isTrending: false,
      isBreaking: false,
      duplicateClusterId: null,
    },
    language: "hi",
    tags: partial.tags ?? ["durg"],
    aiConfidence: 0.8,
    sourceCount: 1,
    categoryLabel: partial.categoryLabel ?? "छत्तीसगढ़",
    desk: partial.desk ?? {
      id: "cg-ai-desk",
      name: "State Desk",
      nameHi: "राज्य डेस्क",
    },
  };
}

function feed(articles: HomeArticle[]): GeneratedHomepageFeed {
  return {
    breakingTicker: articles.filter((a) => a.ranking.isBreaking).slice(0, 3),
    editorsPicks: {
      lead: articles[0],
      supporting: articles.slice(1, 3),
    },
    liveWire: articles,
    regionalHighlights: articles.filter((a) => a.tags.includes("durg")),
    trending: articles.slice(0, 4),
    shorts: [],
    newsShorts: [],
    categoryStreams: [],
    footerIntelligence: {
      fetchedAt: new Date().toISOString(),
      storyCount: articles.length,
      breakingCount: 0,
      trendingCount: 0,
      avgConfidence: 0.8,
      trendingSearches: [],
    },
    hyperlocalFeeds: [],
    localBreakingAlerts: [],
    fetchedAt: new Date().toISOString(),
  };
}

describe("engagement daypart", () => {
  it("maps Kolkata hours into editorial dayparts", () => {
    // 2026-07-25 06:30 IST ≈ 2026-07-25T01:00:00Z
    expect(resolveDayPart(Date.parse("2026-07-25T01:00:00Z"))).toBe("morning");
    expect(resolveDayPart(Date.parse("2026-07-25T07:00:00Z"))).toBe("midday");
    expect(resolveDayPart(Date.parse("2026-07-25T12:00:00Z"))).toBe("evening");
    expect(resolveDayPart(Date.parse("2026-07-25T18:00:00Z"))).toBe("night");
  });

  it("returns Hindi briefing titles by daypart", () => {
    const morning = getDayPartCopy(Date.parse("2026-07-25T01:00:00Z"));
    expect(morning.briefingTitleHi).toContain("सुबह");
  });
});

describe("आज का दर्पण", () => {
  it("builds up to 7 district-aware items and hides thin pools", () => {
    const articles = Array.from({ length: 8 }, (_, i) =>
      article({
        slug: `story-${i}`,
        headline: `दुर्ग खबर ${i}`,
        tags: ["durg"],
        priorityScore: 50 - i,
      })
    );
    const briefing = buildDailyDarpan(feed(articles), { districtSlug: "durg" });
    expect(briefing).not.toBeNull();
    expect(briefing!.items.length).toBeLessThanOrEqual(7);
    expect(briefing!.items.length).toBeGreaterThanOrEqual(3);
    expect(briefing!.districtSlug).toBe("durg");
  });

  it("returns null when fewer than 3 stories", () => {
    const briefing = buildDailyDarpan(
      feed([
        article({ slug: "a", headline: "One" }),
        article({ slug: "b", headline: "Two" }),
      ]),
      { districtSlug: "raipur" }
    );
    expect(briefing).toBeNull();
  });

  it("prioritizes breaking into top ranks", () => {
    const articles = Array.from({ length: 6 }, (_, i) =>
      article({
        slug: `n-${i}`,
        headline: `Normal ${i}`,
        priorityScore: 20,
      })
    );
    articles.push(
      article({
        slug: "break-1",
        headline: "Breaking alert",
        urgency: "high",
        priorityScore: 5,
        ranking: {
          priorityScore: 5,
          reasons: [],
          isTrending: false,
          isBreaking: true,
          duplicateClusterId: null,
        },
      })
    );
    const briefing = buildDailyDarpan(feed(articles), { districtSlug: "raipur" });
    expect(briefing!.items.slice(0, 3).some((i) => i.slug === "break-1")).toBe(
      true
    );
  });
});

describe("story format classification", () => {
  it("labels live and breaking distinctly", () => {
    expect(
      classifyStoryFormat(
        article({ slug: "l", headline: "Live", isLive: true })
      )
    ).toBe("live");
    expect(
      classifyStoryFormat(
        article({
          slug: "b",
          headline: "Break",
          urgency: "high",
          ranking: {
            priorityScore: 1,
            reasons: [],
            isTrending: false,
            isBreaking: true,
            duplicateClusterId: null,
          },
        })
      )
    ).toBe("breaking");
  });

  it("detects explainer and fact-check from evidence in text", () => {
    expect(
      classifyStoryFormat(
        article({ slug: "e", headline: "समझिए: योजना क्या है" })
      )
    ).toBe("explainer");
    expect(
      classifyStoryFormat(
        article({ slug: "f", headline: "Fact check: अफवाह गलत" })
      )
    ).toBe("fact_check");
  });
});

describe("what changed", () => {
  it("returns only updates after last read", () => {
    const coverage = {
      eventId: "evt-1",
      eventTitle: "Hub",
      clusterStatus: "ongoing",
      showTimeline: true,
      items: [
        {
          id: "1",
          storyId: "1",
          slug: "old",
          headline: "Old",
          summary: null,
          publishedAt: "2026-07-25T04:00:00.000Z",
          eventAt: "2026-07-25T04:00:00.000Z",
          sortAt: "2026-07-25T04:00:00.000Z",
          usedEventTime: true,
          updateType: "update",
          statusLabelHi: "अपडेट",
          statusLabelEn: "Update",
          district: null,
          districtSlug: null,
          category: null,
          sourceConfidence: null,
          isCurrent: true,
          isLatest: false,
          href: "/story/old",
          whatChanged: null,
        },
        {
          id: "2",
          storyId: "2",
          slug: "new",
          headline: "New guideline",
          summary: null,
          publishedAt: "2026-07-25T10:00:00.000Z",
          eventAt: "2026-07-25T10:00:00.000Z",
          sortAt: "2026-07-25T10:00:00.000Z",
          usedEventTime: true,
          updateType: "update",
          statusLabelHi: "अपडेट",
          statusLabelEn: "Update",
          district: null,
          districtSlug: null,
          category: null,
          sourceConfidence: null,
          isCurrent: false,
          isLatest: true,
          href: "/story/new",
          whatChanged: "नई गाइडलाइन",
        },
      ],
      visibleItems: [],
      collapsedItems: [],
      collapsedCount: 0,
      currentId: "1",
      latestId: "2",
      nav: {
        previous: null,
        next: null,
        latest: null,
        overviewHref: "/hub/old",
        districtHref: null,
        categoryHref: null,
      },
    } as ContinuingCoverageVm;

    const model = buildWhatChanged(coverage, "2026-07-25T06:00:00.000Z");
    expect(model?.updateCount).toBe(1);
    expect(model?.updates[0]?.whatChanged).toBe("नई गाइडलाइन");
    expect(buildWhatChanged(coverage, "2026-07-25T11:00:00.000Z")).toBeNull();
  });
});

describe("local pulse + developing", () => {
  it("composes pulse only when district content exists", () => {
    const articles = [
      article({
        slug: "d1",
        headline: "दुर्ग में सड़क मरम्मत",
        tags: ["durg"],
        priorityScore: 60,
        ranking: {
          priorityScore: 60,
          reasons: [],
          isTrending: true,
          isBreaking: true,
          duplicateClusterId: null,
        },
      }),
      article({
        slug: "d2",
        headline: "दुर्ग नगर निगम नोटिस",
        tags: ["durg"],
        priorityScore: 40,
      }),
      article({
        slug: "d3",
        headline: "दुर्ग परीक्षा अपडेट",
        tags: ["durg"],
        priorityScore: 30,
      }),
    ];
    const pulse = buildLocalPulse(feed(articles), { districtSlug: "durg" });
    expect(pulse).not.toBeNull();
    expect(pulse!.districtSlug).toBe("durg");
  });

  it("picks a developing teaser from live/breaking pool", () => {
    const articles = [
      article({
        slug: "live-1",
        headline: "लाइव अपडेट: रायपुर",
        isLive: true,
        tags: ["raipur"],
        priorityScore: 70,
      }),
      article({ slug: "x", headline: "Other", priorityScore: 10 }),
    ];
    const teaser = pickDevelopingStory(feed(articles), {
      districtSlug: "raipur",
    });
    expect(teaser?.slug).toBe("live-1");
  });
});
