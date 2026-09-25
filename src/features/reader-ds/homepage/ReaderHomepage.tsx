"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { LeadStory, Masthead, ReaderShell, SecondaryStory, SectionHeader } from "../components";
import { useJdDsT } from "../i18n";
import { toReaderStory, type ReaderStory } from "../utils";
import { hasVerifiedRealMedia, extractVerifiedRealMediaUrl } from "@/lib/news/images/validate";
import { DurgSolarInlineAd } from "@/components/ads/DurgSolarInlineAd";

type ReaderHomepageProps = {
  feed: GeneratedHomepageFeed;
  allArticles?: HomeArticle[];
  nativeAd?: any;
  adsEnabled?: boolean;
  verifiedRatesNavEnabled?: boolean;
};

/**
 * Rebuilt Jan Darpan App Home — Broad Platform Content Discovery.
 *
 * Requirements:
 * - Presents all eligible articles available in the platform using approved visual system.
 * - Clean app-style hierarchy: Hero lead + continuous discovery stream of news cards.
 * - Approved news cards retain: real clean image, headline, district/category, time, source.
 * - Strict media quality: NEVER display mockups, AI images, stock, placeholders, or broken images.
 * - Inline Durg Solar Ad inserted after every 3 news articles.
 * - ZERO website footers. Canonical Live header.
 */
export function ReaderHomepage({
  feed,
  allArticles = [],
}: ReaderHomepageProps) {
  const { locale, t } = useJdDsT();

  // Combine and deduplicate all eligible articles from feed and platform inventory
  const eligibleStories: ReaderStory[] = useMemo(() => {
    const rawList: HomeArticle[] = [];

    if (feed) {
      if (feed.editorsPicks?.lead) rawList.push(feed.editorsPicks.lead);
      if (feed.editorsPicks?.supporting) rawList.push(...feed.editorsPicks.supporting);
      if (feed.trending) rawList.push(...feed.trending);
      if (feed.regionalHighlights) rawList.push(...feed.regionalHighlights);
      if (feed.liveWire) rawList.push(...feed.liveWire);
      if (feed.breakingTicker) rawList.push(...feed.breakingTicker);
    }

    if (allArticles && allArticles.length > 0) {
      rawList.push(...allArticles);
    }

    const seen = new Set<string>();
    const out: ReaderStory[] = [];

    for (const a of rawList) {
      if (!a?.slug || !a.headline?.trim() || seen.has(a.slug)) continue;

      // STRICT REAL MEDIA RULE: Clean, verified real story media only
      const verifiedUrl = extractVerifiedRealMediaUrl(a) || a.imageUrl;
      if (!verifiedUrl || !hasVerifiedRealMedia(verifiedUrl)) continue;

      seen.add(a.slug);
      out.push(
        toReaderStory({
          ...a,
          imageUrl: verifiedUrl,
        })
      );
    }

    return out;
  }, [feed, allArticles]);

  const lead = eligibleStories[0] ?? null;
  const rest = eligibleStories.slice(1);

  const pageTitle = locale === "en" ? "Home" : "होम";
  const sectionTitle = locale === "en" ? "Platform News Discovery" : "ताज़ा सत्यापित समाचार";

  return (
    <ReaderShell activeNav="home">
      <Masthead />

      <main
        id="main-content"
        role="main"
        className="jd-shell"
        style={{
          flex: 1,
          background: "var(--jd-paper)",
          padding: "16px 14px 40px",
          maxWidth: 960,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* App-style Page Identification Header */}
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            paddingBottom: 12,
            marginBottom: 16,
            borderBottom: "1.5px solid var(--jd-line)",
          }}
        >
          <div>
            <h1
              className="jd-serif"
              style={{
                margin: 0,
                fontSize: "clamp(22px, 3.2vw, 28px)",
                fontWeight: 800,
                color: "var(--jd-ink)",
                letterSpacing: "-0.02em",
              }}
            >
              {pageTitle}
            </h1>
            <p
              className="jd-ui"
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "var(--jd-muted)",
              }}
            >
              {sectionTitle}
            </p>
          </div>
          <span
            className="jd-ui"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--jd-red)",
            }}
          >
            {eligibleStories.length} {locale === "en" ? "Stories" : "सत्यापित खबरें"}
          </span>
        </header>

        {/* Lead Story Card (Story #1) */}
        {lead ? (
          <div style={{ marginBottom: 20 }}>
            <LeadStory story={lead} priority={true} />
          </div>
        ) : null}

        {/* Continuous Discovery Stream with Inline Commercial Insertion after every 3 articles */}
        <div className="jd-home-feed" data-testid="jd-home-feed">
          <SectionHeader
            title={locale === "en" ? "All Stories" : "सभी समाचार"}
            moreHref="/latest"
            moreLabel={locale === "en" ? "Taza ›" : "ताज़ा ›"}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {rest.map((story, i) => {
              // 1-indexed count in feed (lead is Story #1, so rest starts at #2)
              const storyIndex = lead ? i + 2 : i + 1;
              const showAdAfter = storyIndex % 3 === 0;

              return (
                <React.Fragment key={story.slug}>
                  <SecondaryStory
                    story={story}
                    last={i === rest.length - 1}
                    toneIndex={i}
                  />

                  {/* Inline Durg Solar Ad Insertion after every 3 news articles */}
                  {showAdAfter && (
                    <DurgSolarInlineAd index={Math.floor(storyIndex / 3)} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </main>
    </ReaderShell>
  );
}
