import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContinuingCoverageTimeline } from "./ContinuingCoverageTimeline";
import { buildContinuingCoverage } from "@/lib/events/continuing-coverage";
import type { EventClusterArticle } from "@/lib/events/fetch-event-cluster-articles";

function article(
  partial: Partial<EventClusterArticle> &
    Pick<EventClusterArticle, "id" | "slug" | "headline" | "published_at">
): EventClusterArticle {
  return {
    event_id: "evt-1",
    summary: "संक्षिप्त अपडेट सार।",
    editorial_metadata: {},
    geo_metadata: null,
    tags: [],
    language: "hi",
    created_at: partial.published_at,
    ...partial,
  };
}

describe("ContinuingCoverageTimeline", () => {
  it("renders Hindi labels, current/latest markers, and valid links", () => {
    const coverage = buildContinuingCoverage({
      eventId: "evt-1",
      eventTitle: "रायपुर जलभराव",
      articles: [
        article({
          id: "a1",
          slug: "first",
          headline: "बारिश शुरू",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
        article({
          id: "a2",
          slug: "second",
          headline: "जलभराव बढ़ा",
          published_at: "2026-07-21T10:00:00.000Z",
        }),
        article({
          id: "a3",
          slug: "third",
          headline: "राहत कार्य",
          published_at: "2026-07-22T10:00:00.000Z",
        }),
      ],
      currentSlug: "second",
      eventViewModel: {
        event_id: "evt-1",
        canonical_title: "रायपुर जलभराव",
        summary: null,
        status: "live",
        is_live: true,
        coverage_slug: "raipur-flood",
        cluster_confidence: 0.7,
        region: "raipur",
        category: "local",
        signal_count: 2,
        tracked_since: null,
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
          cluster_confidence_score: 0.7,
          cluster_confidence_label: "medium",
        },
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(ContinuingCoverageTimeline, {
        coverage,
        locale: "hi",
      })
    );

    expect(html).toContain("इस खबर का पूरा घटनाक्रम");
    expect(html).toContain("अभी पढ़ रहे हैं");
    expect(html).toContain("नवीनतम");
    expect(html).toContain("जारी कवरेज");
    expect(html).toContain("सभी अपडेट देखें");
    expect(html).toContain('href="/story/first"');
    expect(html).toContain('href="/story/third"');
    expect(html).toContain('href="/live/raipur-flood"');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("jd-coverage-timeline");
    // Current story should not be a navigable self-link.
    expect(html).not.toMatch(/href="\/story\/second"/);
    // Mobile-safe: no fixed widths that force horizontal overflow.
    expect(html).not.toMatch(/width:\s*\d{3,}px/);
  });

  it("collapses older updates on long timelines", () => {
    const articles = Array.from({ length: 7 }, (_, i) =>
      article({
        id: `a${i}`,
        slug: `s-${i}`,
        headline: `अपडेट ${i}`,
        published_at: `2026-07-${String(10 + i).padStart(2, "0")}T10:00:00.000Z`,
      })
    );
    const coverage = buildContinuingCoverage({
      eventId: "evt-1",
      articles,
      currentSlug: "s-6",
      visibleLimit: 5,
    });

    const html = renderToStaticMarkup(
      React.createElement(ContinuingCoverageTimeline, {
        coverage,
        locale: "hi",
      })
    );

    expect(html).toContain("2 पुराने अपडेट");
    expect(html).toContain("jd-coverage-timeline__older");
  });

  it("renders nothing for single-story clusters", () => {
    const coverage = buildContinuingCoverage({
      eventId: "evt-1",
      articles: [
        article({
          id: "a1",
          slug: "only",
          headline: "अकेली",
          published_at: "2026-07-20T10:00:00.000Z",
        }),
      ],
      currentSlug: "only",
    });

    const html = renderToStaticMarkup(
      React.createElement(ContinuingCoverageTimeline, {
        coverage,
        locale: "hi",
      })
    );
    expect(html).toBe("");
  });
});
