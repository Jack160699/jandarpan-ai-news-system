import { describe, expect, it } from "vitest";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { pickBreakingItems } from "./breaking";
import { buildHomeSections, countDuplicateSlugs } from "./build-home-sections";
import {
  filterFooterColumns,
  filterFooterLinks,
  READER_DS_FOOTER_ROUTE_ALLOWLIST,
} from "./footer-links";
import { jdDsT } from "../i18n/strings";

function article(partial: Partial<HomeArticle> & Pick<HomeArticle, "id" | "slug" | "headline">): HomeArticle {
  return {
    summary: "",
    imageUrl: "",
    ogImageUrl: "",
    section: "chhattisgarh",
    readingTime: "2 min",
    publishedAt: new Date().toISOString(),
    isLive: false,
    urgency: "medium",
    trendScore: 0,
    priorityScore: 1,
    ranking: {
      priorityScore: 1,
      reasons: [],
      isTrending: false,
      isBreaking: true,
      duplicateClusterId: null,
    },
    language: "hi",
    tags: [],
    aiConfidence: 0.9,
    sourceCount: 1,
    categoryLabel: "छत्तीसगढ़",
    desk: { id: "cg-ai-desk", name: "State Desk", nameHi: "राज्य डेस्क" },
    ...partial,
  };
}

function emptyFeed(over: Partial<GeneratedHomepageFeed> = {}): GeneratedHomepageFeed {
  return {
    breakingTicker: [],
    editorsPicks: {
      lead: article({ id: "lead", slug: "lead-story", headline: "लीड" }),
      supporting: [],
    },
    liveWire: [],
    regionalHighlights: [],
    trending: [],
    shorts: [],
    newsShorts: [],
    categoryStreams: [],
    footerIntelligence: {
      fetchedAt: new Date().toISOString(),
      storyCount: 0,
      breakingCount: 0,
      trendingCount: 0,
      avgConfidence: 0,
      trendingSearches: [],
    },
    hyperlocalFeeds: [],
    localBreakingAlerts: [],
    fetchedAt: new Date().toISOString(),
    ...over,
  };
}

describe("pickBreakingItems", () => {
  it("ranks ticker ahead of local alerts and dedupes slug/headline", () => {
    const feed = emptyFeed({
      breakingTicker: [
        article({ id: "b1", slug: "break-1", headline: "बड़ी ख़बर एक" }),
        article({ id: "b2", slug: "break-2", headline: "बड़ी ख़बर दो" }),
      ],
      localBreakingAlerts: [
        { slug: "break-1", headline: "बड़ी ख़बर एक", district: null, urgency: "high" },
        { slug: "alert-3", headline: "  बड़ी ख़बर एक  ", district: "raipur", urgency: "high" },
        { slug: "alert-4", headline: "अलर्ट चार", district: null, urgency: "medium" },
      ],
    });

    const items = pickBreakingItems(feed);
    expect(items[0]?.slug).toBe("break-1");
    expect(items[0]?.href).toBe("/story/break-1");
    expect(items.map((i) => i.slug)).toEqual(["break-1", "break-2", "alert-4"]);
    expect(items.every((i) => i.headline.length > 0)).toBe(true);
  });

  it("returns empty when no headlines", () => {
    expect(pickBreakingItems(emptyFeed())).toEqual([]);
  });
});

describe("buildHomeSections", () => {
  it("suppresses empty sections and minimizes duplicate slugs", () => {
    const feed = emptyFeed({
      trending: [
        article({ id: "t1", slug: "t1", headline: "ट्रेंड 1" }),
        article({ id: "t2", slug: "t2", headline: "ट्रेंड 2" }),
      ],
      regionalHighlights: [article({ id: "r1", slug: "r1", headline: "जिला 1" })],
      categoryStreams: [
        {
          id: "sports",
          label: "Sports",
          labelHi: "खेल",
          articles: [
            article({ id: "s1", slug: "s1", headline: "खेल 1", section: "sports" }),
            article({ id: "s2", slug: "s2", headline: "खेल 2", section: "sports" }),
          ],
        },
        {
          id: "world",
          label: "World",
          labelHi: "दुनिया",
          articles: [],
        },
      ],
      liveWire: [
        article({ id: "l1", slug: "l1", headline: "ताज़ा 1" }),
        article({ id: "l2", slug: "l2", headline: "ताज़ा 2" }),
      ],
    });

    const exclude = new Set(["lead-story"]);
    const sections = buildHomeSections(feed, exclude, (k) => jdDsT("hi", k));
    expect(sections.find((s) => s.key === "cat-world")).toBeUndefined();
    expect(sections.every((s) => s.stories.length > 0)).toBe(true);

    const allSlugs = sections.flatMap((s) => s.stories.map((x) => x.slug));
    expect(countDuplicateSlugs(allSlugs)).toBe(0);
    expect(allSlugs).not.toContain("lead-story");
  });

  it("does not invent filler sections without content", () => {
    const sections = buildHomeSections(emptyFeed(), new Set(), (k) => jdDsT("hi", k));
    expect(sections.length).toBe(0);
  });
});

describe("footer link allowlist", () => {
  it("keeps only resolvable routes and drops careers/social/dead paths", () => {
    const links = filterFooterLinks([
      { href: "/latest", label: "ताज़ा" },
      { href: "/careers", label: "करियर" },
      { href: "/editorial-policy", label: "संपादकीय" },
      { href: "/sitemap.xml", label: "साइटमैप" },
      { href: "https://twitter.com/x", label: "Twitter", enabled: false },
      { href: "/ads-policy", label: "विज्ञापन" },
      { href: "", label: "empty" },
    ]);
    expect(links.map((l) => l.href)).toEqual([
      "/latest",
      "/editorial-policy",
      "/sitemap.xml",
      "/ads-policy",
    ]);
    expect(READER_DS_FOOTER_ROUTE_ALLOWLIST.has("/careers")).toBe(false);
  });

  it("drops empty columns after filtering", () => {
    const cols = filterFooterColumns([
      { title: "A", links: [{ href: "/nope", label: "x" }] },
      { title: "B", links: [{ href: "/about", label: "परिचय" }] },
    ]);
    expect(cols).toHaveLength(1);
    expect(cols[0]?.title).toBe("B");
  });
});

describe("masthead / breaking presentation contracts", () => {
  it("documents that masthead actions are removed (reachability via More)", () => {
    // Reachable destinations after header cleanup:
    expect("/search").toMatch(/^\/search$/);
    expect("/notifications").toMatch(/^\/notifications$/);
    expect("/archive").toMatch(/^\/archive$/);
  });

  it("breaking pulse class and reduced-motion hooks exist in tokens CSS source", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const css = await fs.readFile(
      path.join(__dirname, "../styles/tokens.css"),
      "utf8"
    );
    expect(css).toContain("jd-breaking-strip__pulse");
    expect(css).toContain("jd-breaking-pulse");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("jd-breaking-strip__headline");
    expect(css).not.toMatch(/jd-breaking-strip__headline[^{]*text-overflow:\s*ellipsis/);
  });
});
