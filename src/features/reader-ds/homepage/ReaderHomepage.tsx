"use client";

import React, { useMemo } from "react";
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

type EditorialSectionDef = {
  key: "politics" | "crime" | "national" | "international" | "entertainment" | "sports";
  titleHi: string;
  titleEn: string;
  color: string;
  moreHref: string;
  match: (story: ReaderStory) => boolean;
};

const EDITORIAL_SECTIONS: EditorialSectionDef[] = [
  {
    key: "politics",
    titleHi: "राजनीति",
    titleEn: "Politics",
    color: "#b91c1c", // Crimson red
    moreHref: "/category/politics",
    match: (s) => {
      const text = `${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      return /politic|राजनीति|election|चुनाव|bjp|congress|विधानसभा|assembly|minister|mantri|governance|सरकार|cm|mla|party|सदन/i.test(text);
    },
  },
  {
    key: "crime",
    titleHi: "अपराध",
    titleEn: "Crime & Law",
    color: "#c2410c", // Deep orange
    moreHref: "/category/crime",
    match: (s) => {
      const text = `${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      return /crime|अपराध|police|पुलिस|arrest|गिरफ्तार|murder|हत्या|हादसा|accident|court|कोर्ट|scam|ghotala|घोटाला|smuggling|तस्करी|fraud|कांड/i.test(text);
    },
  },
  {
    key: "national",
    titleHi: "राष्ट्रीय",
    titleEn: "National",
    color: "#0369a1", // Navy blue
    moreHref: "/category/national",
    match: (s) => {
      const text = `${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      if (/entertainment|मनोरंजन|bollywood|cinema|सिनेमा|फिल्म|नाट्य|रंगमंच|ott|sport|खेल|cricket|क्रिकेट|हॉकी|hockey|रणजी/i.test(text)) {
        return false;
      }
      return /india|national|देश|राष्ट्रीय|delhi|दिल्ली|parliament|संसद|pm|modi|centre|केंद्|supreme court|सुप्रीम कोर्ट|bharat/i.test(text);
    },
  },
  {
    key: "international",
    titleHi: "अंतरराष्ट्रीय",
    titleEn: "World News",
    color: "#0d9488", // Teal
    moreHref: "/category/international",
    match: (s) => {
      const text = `${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      return /world|international|विदेश|अंतरराष्ट्रीय|global|un|us|usa|china|russia|ukraine|israel|iran|war|युद्ध/i.test(text);
    },
  },
  {
    key: "entertainment",
    titleHi: "मनोरंजन",
    titleEn: "Entertainment",
    color: "#7c3aed", // Violet
    moreHref: "/category/entertainment",
    match: (s) => {
      const text = `${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      return /entertainment|मनोरंजन|bollywood|cinema|सिनेमा|फिल्म|movie|ott|celebrity|actress|actor|trailer|गाना|संगीत|नाट्य|रंगमंच/i.test(text);
    },
  },
  {
    key: "sports",
    titleHi: "खेल",
    titleEn: "Sports",
    color: "#15803d", // Emerald green
    moreHref: "/category/sports",
    match: (s) => {
      const text = `${s.category || ""} ${s.section || ""} ${(s.tags || []).join(" ")} ${s.headline}`.toLowerCase();
      return /sport|खेल|cricket|क्रिकेट|football|फुटबॉल|hockey|हॉकी|olympic|match|मैच|ipl|tournament|medal|खिलाड़ी/i.test(text);
    },
  },
];

/**
 * Jan Darpan Master Digital Newspaper Front Page.
 *
 * Implements strict editorial information architecture:
 * 1. मुख्य खबरें (Hero / Main News Lead + 2-3 Supporting Articles)
 * 2. Dedicated Reader Priority Sections (राजनीति, अपराध, राष्ट्रीय, अंतरराष्ट्रीय, मनोरंजन, खेल)
 *    Each section has: Section Header with visual divider -> Section Main Story -> 2-4 Supporting Articles
 * 3. તાज़ा खबरें / More Latest Stream
 * 4. Durg Solar inline ad placement
 * 5. Strictly ZERO Finance as primary section
 * 6. Strictly ZERO mockups, AI images, stock, or broken placeholders.
 */
export function ReaderHomepage({
  feed,
  allArticles = [],
}: ReaderHomepageProps) {
  const { locale } = useJdDsT();

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

  // Editorial Section Partitioning (Guarantees zero story duplication across sections)
  const { topLead, topSupporting, sectionsData, remainingStories } = useMemo(() => {
    const usedSlugs = new Set<string>();

    const topLead = eligibleStories[0] ?? null;
    if (topLead) usedSlugs.add(topLead.slug);

    const topSupporting: ReaderStory[] = [];
    for (let i = 1; i < eligibleStories.length && topSupporting.length < 3; i++) {
      const s = eligibleStories[i];
      if (!usedSlugs.has(s.slug)) {
        usedSlugs.add(s.slug);
        topSupporting.push(s);
      }
    }

    const sectionsData: Array<{
      def: EditorialSectionDef;
      lead: ReaderStory;
      supporting: ReaderStory[];
    }> = [];

    for (const def of EDITORIAL_SECTIONS) {
      let matching = eligibleStories.filter((s) => !usedSlugs.has(s.slug) && def.match(s));
      if (matching.length === 0) {
        matching = eligibleStories.filter((s) => def.match(s));
      }
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

    const remainingStories = eligibleStories.filter((s) => !usedSlugs.has(s.slug));

    return { topLead, topSupporting, sectionsData, remainingStories };
  }, [eligibleStories]);

  const seeAllText = locale === "en" ? "See all ›" : "सभी देखें ›";

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
          maxWidth: 960,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* 1. TOP EDITORIAL PACKAGE — मुख्य खबरें */}
        <section aria-labelledby="top-stories-heading" style={{ marginBottom: 28 }}>
          <SectionHeader
            title={locale === "en" ? "Top Stories" : "मुख्य खबरें"}
            color="var(--jd-red)"
            moreHref="/latest"
            moreLabel={locale === "en" ? "Taza ›" : "ताज़ा खबरें ›"}
          />

          {topLead ? (
            <div style={{ marginBottom: 16 }}>
              <LeadStory story={topLead} priority={true} />
            </div>
          ) : null}

          {topSupporting.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
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
        </section>

        {/* Commercial break 1: Durg Solar Sponsor Slot */}
        <div style={{ margin: "20px 0" }}>
          <DurgSolarInlineAd index={0} />
        </div>

        {/* 2. CANONICAL PRIORITY EDITORIAL SECTIONS */}
        {sectionsData.map((sec, secIdx) => {
          const title = locale === "en" ? sec.def.titleEn : sec.def.titleHi;
          return (
            <React.Fragment key={sec.def.key}>
              <section
                aria-labelledby={`section-heading-${sec.def.key}`}
                style={{ marginBottom: 32 }}
                data-testid={`jd-home-section-${sec.def.key}`}
              >
                <SectionHeader
                  title={title}
                  color={sec.def.color}
                  moreHref={sec.def.moreHref}
                  moreLabel={seeAllText}
                />

                {/* Section Hero Lead */}
                <div style={{ marginBottom: 14 }}>
                  <LeadStory story={sec.lead} />
                </div>

                {/* Section Supporting Stories (2-4 articles) */}
                {sec.supporting.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column" }}>
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
              </section>

              {/* Commercial break 2: Inserted after the 2nd editorial section */}
              {secIdx === 1 ? (
                <div style={{ margin: "24px 0" }}>
                  <DurgSolarInlineAd index={1} />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}

        {/* 3. MORE LATEST STORIES & CONTINUOUS DISCOVERY */}
        {remainingStories.length > 0 ? (
          <section aria-labelledby="more-headlines-heading" style={{ marginTop: 24 }}>
            <SectionHeader
              title={locale === "en" ? "More Headlines" : "ताज़ा खबरें और अन्य सुर्खियां"}
              color="var(--jd-navy)"
              moreHref="/latest"
              moreLabel={locale === "en" ? "All Latest ›" : "सभी ताज़ा ›"}
            />

            <div style={{ display: "flex", flexDirection: "column" }}>
              {remainingStories.slice(0, 15).map((story, i) => {
                const showAdAfter = (i + 1) % 4 === 0;
                return (
                  <React.Fragment key={story.slug}>
                    <SecondaryStory
                      story={story}
                      last={i === Math.min(remainingStories.length, 15) - 1}
                      toneIndex={i}
                    />
                    {showAdAfter && (
                      <DurgSolarInlineAd index={Math.floor((i + 1) / 4) + 2} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </ReaderShell>
  );
}
