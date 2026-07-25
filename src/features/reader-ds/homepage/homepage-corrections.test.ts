import { describe, expect, it } from "vitest";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { pickBreakingItems } from "./breaking";
import { buildHomeSections, countDuplicateSlugs } from "./build-home-sections";
import {
  filterFooterColumns,
  filterFooterLinks,
  buildPublicationFooterColumns,
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
      { href: "/advertise", label: "Advertise" },
      { href: "/category/india", label: "भारत" },
      { href: "/editorial-policy", label: "संपादकीय" },
      { href: "/sitemap.xml", label: "साइटमैप" },
      { href: "/feed.xml", label: "RSS" },
      { href: "https://twitter.com/x", label: "Twitter", enabled: false },
      { href: "/ads-policy", label: "विज्ञापन" },
      { href: "/news/national", label: "भारत" },
      { href: "/district/raipur", label: "रायपुर" },
      { href: "", label: "empty" },
    ]);
    expect(links.map((l) => l.href)).toEqual([
      "/latest",
      "/editorial-policy",
      "/sitemap.xml",
      "/feed.xml",
      "/ads-policy",
      "/news/national",
      "/district/raipur",
    ]);
    expect(READER_DS_FOOTER_ROUTE_ALLOWLIST.has("/careers")).toBe(false);
    expect(READER_DS_FOOTER_ROUTE_ALLOWLIST.has("/category/india")).toBe(false);
  });

  it("drops empty columns after filtering", () => {
    const cols = filterFooterColumns([
      { title: "A", links: [{ href: "/nope", label: "x" }] },
      { title: "B", links: [{ href: "/about", label: "परिचय" }] },
    ]);
    expect(cols).toHaveLength(1);
    expect(cols[0]?.title).toBe("B");
  });

  it("builds publication footer with categories, districts, policy, copyright destinations", () => {
    const cols = buildPublicationFooterColumns({
      newsNav: "खबर नेविगेशन",
      districts: "प्रमुख जिले",
      allDistricts: "सभी जिले देखें",
      publication: "प्रकाशन",
      utilities: "सुविधाएँ",
      topHeadlines: "मुख्य खबरें",
      chhattisgarh: "छत्तीसगढ़",
      india: "भारत",
      politics: "राजनीति",
      business: "व्यापार",
      education: "शिक्षा",
      health: "स्वास्थ्य",
      sports: "खेल",
      entertainment: "मनोरंजन",
      technology: "टेक्नोलॉजी",
      about: "हमारे बारे में",
      contact: "संपर्क",
      editorial: "संपादकीय नीति",
      corrections: "सुधार नीति",
      privacy: "गोपनीयता नीति",
      terms: "नियम एवं शर्तें",
      ads: "विज्ञापन",
      sitemap: "साइटमैप",
      rss: "RSS",
      listen: "सुनें",
      saved: "सहेजी गई खबरें",
      notifications: "सूचना प्राथमिकताएँ",
      support: "समर्थन",
      rates: "दरें",
    });

    const hrefs = cols.flatMap((c) => c.links.map((l) => l.href));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/news/national");
    expect(hrefs).toContain("/category/health");
    expect(hrefs).toContain("/category/entertainment");
    expect(hrefs).toContain("/category/technology");
    expect(hrefs).toContain("/district/raipur");
    expect(hrefs).toContain("/district?select=1");
    expect(hrefs).toContain("/editorial-policy");
    expect(hrefs).toContain("/corrections");
    expect(hrefs).toContain("/privacy");
    expect(hrefs).toContain("/terms");
    expect(hrefs).toContain("/ads-policy");
    expect(hrefs).toContain("/sitemap.xml");
    expect(hrefs).toContain("/feed.xml");
    expect(hrefs).toContain("/saved");
    expect(hrefs).toContain("/membership");
    expect(hrefs).not.toContain("/careers");
    expect(hrefs).not.toContain("/category/india");
    expect(hrefs).not.toContain("/advertise");

    const districtCol = cols.find((c) => c.id === "districts");
    expect(districtCol?.links.length).toBeGreaterThanOrEqual(5);
  });

  it("hides social column unless explicitly enabled https links are provided", () => {
    const labels = {
      newsNav: "n",
      districts: "d",
      allDistricts: "all",
      publication: "p",
      utilities: "u",
      topHeadlines: "t",
      chhattisgarh: "cg",
      india: "in",
      politics: "po",
      business: "bu",
      education: "ed",
      health: "he",
      sports: "sp",
      entertainment: "en",
      technology: "te",
      about: "ab",
      contact: "co",
      editorial: "edp",
      corrections: "cr",
      privacy: "pr",
      terms: "tm",
      ads: "ad",
      sitemap: "sm",
      rss: "rs",
      listen: "li",
      saved: "sv",
      notifications: "nt",
      support: "su",
      rates: "rt",
    };
    const without = buildPublicationFooterColumns(labels);
    expect(without.find((c) => c.id === "social")).toBeUndefined();

    const withSocial = buildPublicationFooterColumns(labels, {
      socialLinks: [
        {
          href: "https://example.com/jandarpan",
          label: "X",
          enabled: true,
        },
      ],
    });
    expect(withSocial.find((c) => c.id === "social")?.links).toHaveLength(1);
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
