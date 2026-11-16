"use client";

import React, { useMemo, useState } from "react";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { LeadStory, Masthead, ReaderShell, SecondaryStory, SectionHeader } from "../components";
import { useJdDsT } from "../i18n";
import { toReaderStory, type ReaderStory } from "../utils";
import { hasVerifiedRealMedia, extractVerifiedRealMediaUrl } from "@/lib/news/images/validate";
import { DurgSolarInlineAd } from "@/components/ads/DurgSolarInlineAd";

type ReaderHomepageProps = {
  feed: GeneratedHomepageFeed;
  allArticles?: HomeArticle[];
  nativeAd?: Record<string, unknown> | null;
  adsEnabled?: boolean;
  verifiedRatesNavEnabled?: boolean;
};

/** Active News Feed Cutoff: Exclude content older than 7 days from the live homepage feed. */
const MAX_ACTIVE_FEED_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type EditorialSectionDef = {
  key: "chhattisgarh" | "district" | "national" | "international";
  titleHi: string;
  titleEn: string;
  color: string;
  moreHref: string;
  match: (story: ReaderStory) => boolean;
};

const EDITORIAL_SECTIONS: EditorialSectionDef[] = [
  {
    key: "chhattisgarh",
    titleHi: "छत्तीसगढ़ समाचार",
    titleEn: "Chhattisgarh News",
    color: "#b91c1c", // Crimson red
    moreHref: "/category/chhattisgarh",
    match: (s) => {
      if (s.isStatewide || s.geographicScope === "statewide") return true;
      const text = `${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      return /chhattisgarh|छत्तीसगढ़|साय सरकार|विष्णु देव साय|मंत्रिमंडल|विधानसभा|governance|शासन|प्रशासन|सचिवालय/i.test(text);
    },
  },
  {
    key: "district",
    titleHi: "जिला समाचार",
    titleEn: "District News",
    color: "#ea580c", // Deep amber/orange
    moreHref: "/districts",
    match: (s) => {
      // Hyperlocal district stories (Raipur, Durg, Bilaspur, Bastar, etc.)
      if (s.districtSlug && !s.isStatewide) return true;
      const text = `${s.kicker || ""} ${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      return /जिला|तहसील|थाना|raipur|रायपुर|durg|दुर्ग|bhilai|भिलाई|bilaspur|बिलासपुर|bastar|बस्तर|korba|कोरबा|rajnandgaon|राजनंदगांव|surguja|सरगुजा|jagdalpur|जगदलपुर|dhamtari|धमतरी|mahasamund|महासमुंद|kanker|कांकेर|balod|बालोद|bemetara|बेमेतरा|champa|जांजगीर|रायगढ़|raigarh/i.test(text);
    },
  },
  {
    key: "national",
    titleHi: "राष्ट्रीय समाचार",
    titleEn: "National News",
    color: "#0369a1", // Navy blue
    moreHref: "/category/national",
    match: (s) => {
      if (s.geographicScope === "national") return true;
      const text = `${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      if (/world|international|विदेश|अंतरराष्ट्रीय/i.test(text)) return false;
      return /india|national|देश|राष्ट्रीय|delhi|दिल्ली|parliament|संसद|pm modi|मोदी|centre|केंद्|supreme court|सुप्रीम कोर्ट|bharat|भारत/i.test(text);
    },
  },
  {
    key: "international",
    titleHi: "अंतरराष्ट्रीय समाचार",
    titleEn: "World News",
    color: "#0d9488", // Teal
    moreHref: "/category/international",
    match: (s) => {
      if (s.geographicScope === "international") return true;
      const text = `${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      return /world|international|विदेश|अंतरराष्ट्रीय|global|un|us|usa|china|russia|ukraine|israel|iran|war|युद्ध|व्हाइट हाउस|ट्रंप/i.test(text);
    },
  },
];

/**
 * Jan Darpan Master Digital Newspaper Front Page.
 *
 * Implements strict editorial information architecture:
 * 1. मुख्य खबरें (Hero / Top Story Lead + Supporting Articles)
 * 2. छत्तीसगढ़ समाचार (Statewide policy & governance)
 * 3. जिला समाचार (District-level hyperlocal news)
 * 4. राष्ट्रीय समाचार (National news)
 * 5. अंतरराष्ट्रीय समाचार (World news)
 * 6. ताज़ा खबरें (Discovery stream of remaining fresh stories)
 * 7. Load More (Reliable interactive pagination revealing 30-40+ fresh stories smoothly)
 *
 * Freshness Policy:
 * - Content older than 7 days is excluded from active feeds (preserved in DB/archive).
 * - Zero duplicated stories across sections.
 * - Zero static empty placeholders.
 */
export function ReaderHomepage({
  feed,
  allArticles = [],
}: ReaderHomepageProps) {
  const { locale } = useJdDsT();
  const [visibleCount, setVisibleCount] = useState(12);

  // Combine, deduplicate, and enforce 7-day freshness cutoff
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
    const nowMs = Date.now();

    for (const a of rawList) {
      if (!a?.slug || !a.headline?.trim() || seen.has(a.slug)) continue;

      // Freshness rule: Exclude stories older than 7 days from the active homepage feed
      if (a.publishedAt) {
        const pubTime = new Date(a.publishedAt).getTime();
        if (Number.isFinite(pubTime)) {
          const ageMs = nowMs - pubTime;
          if (ageMs > MAX_ACTIVE_FEED_AGE_MS) {
            continue; // Exclude from active feed; historical records preserved in DB and /archive
          }
        }
      }

      // MEDIA RULE: Only clean, verified real photos are displayed
      const candidateUrl = extractVerifiedRealMediaUrl(a) || a.imageUrl;
      const verifiedUrl = candidateUrl && hasVerifiedRealMedia(candidateUrl) ? candidateUrl : undefined;

      seen.add(a.slug);
      out.push(
        toReaderStory({
          ...a,
          imageUrl: verifiedUrl ?? "",
        })
      );
    }

    return out;
  }, [feed, allArticles]);

  // Editorial Section Partitioning (Guarantees zero story duplication across sections)
  const { topLead, topSupporting, sectionsData, remainingStories } = useMemo(() => {
    const usedSlugs = new Set<string>();

    // 1. Top Lead Story
    const topLead = eligibleStories[0] ?? null;
    if (topLead) usedSlugs.add(topLead.slug);

    // Supporting stories for Top Stories block (up to 3)
    const topSupporting: ReaderStory[] = [];
    for (let i = 1; i < eligibleStories.length && topSupporting.length < 3; i++) {
      const s = eligibleStories[i];
      if (!usedSlugs.has(s.slug)) {
        usedSlugs.add(s.slug);
        topSupporting.push(s);
      }
    }

    // 2-5. Priority Editorial Sections (Chhattisgarh, District, National, International)
    const sectionsData: Array<{
      def: EditorialSectionDef;
      lead: ReaderStory;
      supporting: ReaderStory[];
    }> = [];

    for (const def of EDITORIAL_SECTIONS) {
      const matching = eligibleStories.filter((s) => !usedSlugs.has(s.slug) && def.match(s));
      if (matching.length > 0) {
        const secLead = matching[0];
        usedSlugs.add(secLead.slug);
        const secSupporting = matching.slice(1, 4).filter((s) => s.slug !== secLead.slug);
        secSupporting.forEach((s) => usedSlugs.add(s.slug));
        sectionsData.push({
          def,
          lead: secLead,
          supporting: secSupporting,
        });
      }
    }

    // 6. Remaining stories flow to More Latest News
    const remainingStories = eligibleStories.filter((s) => !usedSlugs.has(s.slug));

    return { topLead, topSupporting, sectionsData, remainingStories };
  }, [eligibleStories]);

  const seeAllText = locale === "en" ? "See all ›" : "सभी देखें ›";
  const displayedRemaining = remainingStories.slice(0, visibleCount);
  const hasMore = remainingStories.length > visibleCount;

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
          padding: "16px 14px 48px",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* 1. TOP EDITORIAL PACKAGE — मुख्य खबरें (Wide Hero Grid on Desktop) */}
        {topLead ? (
          <section aria-labelledby="top-stories-heading" style={{ marginBottom: 32 }}>
            <SectionHeader
              title={locale === "en" ? "Top Stories" : "मुख्य खबरें"}
              color="var(--jd-red)"
              moreHref="/latest"
              moreLabel={locale === "en" ? "Latest News ›" : "ताज़ा खबरें ›"}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
                gap: 20,
                alignItems: "start",
              }}
            >
              <div style={{ gridColumn: "span 1" }}>
                <LeadStory story={topLead} priority={true} />
              </div>

              {topSupporting.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "#ffffff",
                    border: "1px solid var(--jd-line, #e2e8f0)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  {topSupporting.map((story, i) => (
                    <SecondaryStory
                      key={story.slug}
                      story={story}
                      last={i === topSupporting.length - 1}
                      toneIndex={i}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Commercial break 1: Durg Solar Sponsor Slot */}
        <div style={{ margin: "24px 0" }}>
          <DurgSolarInlineAd index={0} />
        </div>

        {/* 2-5. EDITORIAL SECTIONS (Chhattisgarh, District, National, International) */}
        {sectionsData.map((sec, secIdx) => {
          const title = locale === "en" ? sec.def.titleEn : sec.def.titleHi;
          const isDistrictSection = sec.def.key === "district";

          return (
            <React.Fragment key={sec.def.key}>
              <section
                aria-labelledby={`section-heading-${sec.def.key}`}
                style={{ marginBottom: 36 }}
                data-testid={`jd-home-section-${sec.def.key}`}
              >
                <SectionHeader
                  title={title}
                  color={sec.def.color}
                  moreHref={sec.def.moreHref}
                  moreLabel={seeAllText}
                />

                {isDistrictSection ? (
                  /* District News Grid Layout with Badges */
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <LeadStory story={sec.lead} />
                    </div>

                    {sec.supporting.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                          gap: 14,
                        }}
                      >
                        {sec.supporting.map((story, i) => (
                          <div
                            key={story.slug}
                            style={{
                              background: "#ffffff",
                              border: "1px solid var(--jd-line, #e2e8f0)",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <SecondaryStory
                              story={story}
                              last={true}
                              toneIndex={i + 1}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* Standard Editorial Split Layout */
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
                      gap: 20,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <LeadStory story={sec.lead} />
                    </div>

                    {sec.supporting.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          background: "#ffffff",
                          border: "1px solid var(--jd-line, #e2e8f0)",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        {sec.supporting.map((story, i) => (
                          <SecondaryStory
                            key={story.slug}
                            story={story}
                            last={i === sec.supporting.length - 1}
                            toneIndex={i}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              {/* Commercial break 2: Inserted after the 2nd editorial section */}
              {secIdx === 1 ? (
                <div style={{ margin: "28px 0" }}>
                  <DurgSolarInlineAd index={1} />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}

        {/* 6. MORE LATEST NEWS (Discovery Stream of Fresh Stories) */}
        {displayedRemaining.length > 0 ? (
          <section aria-labelledby="more-headlines-heading" style={{ marginTop: 28 }}>
            <SectionHeader
              title={locale === "en" ? "More Latest News" : "ताज़ा खबरें और अन्य सुर्खियां"}
              color="var(--jd-navy)"
              moreHref="/latest"
              moreLabel={locale === "en" ? "All Latest ›" : "सभी ताज़ा ›"}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
                gap: 16,
              }}
            >
              {displayedRemaining.map((story, i) => {
                const showAdAfter = (i + 1) % 6 === 0;
                return (
                  <React.Fragment key={story.slug}>
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid var(--jd-line, #e2e8f0)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <SecondaryStory
                        story={story}
                        last={true}
                        toneIndex={i}
                      />
                    </div>
                    {showAdAfter && (
                      <div style={{ gridColumn: "1 / -1", margin: "10px 0" }}>
                        <DurgSolarInlineAd index={Math.floor((i + 1) / 6) + 2} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 7. LOAD MORE / INTERACTIVE PAGINATION */}
            {hasMore ? (
              <div style={{ textAlign: "center", marginTop: 32, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  className="jd-ui"
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid var(--jd-red, #b91c1c)",
                    color: "var(--jd-red, #b91c1c)",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    padding: "10px 28px",
                    borderRadius: 4,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--jd-red, #b91c1c)";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.color = "var(--jd-red, #b91c1c)";
                  }}
                >
                  <span>{locale === "en" ? "Load More News" : "और खबरें देखें"}</span>
                  <span style={{ fontSize: "0.85em", opacity: 0.85 }}>
                    ({remainingStories.length - visibleCount} {locale === "en" ? "more" : "बाकी"})
                  </span>
                </button>
              </div>
            ) : remainingStories.length > 0 ? (
              <div
                style={{
                  textAlign: "center",
                  marginTop: 32,
                  color: "var(--jd-muted, #64748b)",
                  fontSize: "0.875rem",
                }}
              >
                {locale === "en"
                  ? "You have reached the end of today's news feed."
                  : "आप आज की सभी ताज़ा खबरें देख चुके हैं।"}
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </ReaderShell>
  );
}
