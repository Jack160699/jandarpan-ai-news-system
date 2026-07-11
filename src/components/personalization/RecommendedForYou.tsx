"use client";

import Link from "next/link";
import { useMemo } from "react";
import { StoryCard } from "@/components/homepage/StoryCard";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { buildRecommendedArticles } from "@/lib/personalization/recommendations";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { getRecentReadSlugs } from "@/lib/reading-memory";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";

type RecommendedForYouProps = {
  feed: GeneratedHomepageFeed;
};

export function RecommendedForYou({ feed }: RecommendedForYouProps) {
  const { language } = useLanguage();
  const { interests } = useReaderAccount();
  const { prefs } = useReaderPreferences();
  const ctx = useEditorialIntelligenceOptional();
  const { layout } = useHomepageLayout();

  const articles = useMemo(() => {
    const memory = ctx?.memory;
    return buildRecommendedArticles(feed, {
      interestIds: interests,
      homeDistrict: prefs.homeDistrict ?? null,
      followedDistricts: layout.followedDistricts,
      bookmarkSlugs: memory?.bookmarks ?? [],
      recentReadSlugs: memory ? getRecentReadSlugs(memory) : [],
    });
  }, [feed, interests, prefs.homeDistrict, layout.followedDistricts, ctx?.memory]);

  if (!articles.length) return null;

  return (
    <section
      className="hp-section hp-section--secondary hp-recommended"
      aria-labelledby="hp-recommended-title"
    >
      <SectionHeader
        id="hp-recommended-title"
        kicker={pickBilingualLabel(language, "For you", "आपके लिए")}
        title={pickBilingualLabel(language, "Recommended", "सुझाव")}
        description={pickBilingualLabel(
          language,
          "Based on your interests and reading",
          "आपकी रुचि और पढ़ाई के आधार पर"
        )}
      />
      <ul className="hp-recommended__list" role="list">
        {articles.map((article, index) => (
          <li key={article.id} className="hp-recommended__item">
            <StoryCard
              article={article}
              variant="compact"
              rank={index + 1}
              priority={index === 0}
            />
            <p className="hp-recommended__reason">{article.reason}</p>
          </li>
        ))}
      </ul>
      <Link href="/archive" className="hp-section-action">
        {pickBilingualLabel(language, "View reading history", "पढ़ने का इतिहास")}
      </Link>
    </section>
  );
}
