"use client";

import { SectionHeader } from "@/design-system/components/SectionHeader";
import { CompactCard } from "@/design-system/components/editorial/CompactCard";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { RecommendedArticle } from "@/lib/personalization/types";
import type { HomeArticle } from "@/lib/homepage/types";

type ForYouSectionProps = {
  recommended: RecommendedArticle[];
  trendingFallback: HomeArticle[];
};

export function ForYouSection({
  recommended,
  trendingFallback,
}: ForYouSectionProps) {
  const { language } = useLanguage();
  const items = recommended.length > 0 ? recommended : trendingFallback;
  const isPersonalized = recommended.length > 0;

  if (!items.length) return null;

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-labelledby="home-v31-foryou-title"
    >
      <SectionHeader
        title={
          isPersonalized
            ? pickBilingualLabel(language, "For You", "आपके लिए")
            : pickBilingualLabel(language, "Trending Now", "ट्रेंडिंग")
        }
        kicker={
          isPersonalized
            ? pickBilingualLabel(language, "Personalized", "व्यक्तिगत")
            : pickBilingualLabel(language, "Popular", "लोकप्रिय")
        }
      />
      <h2 id="home-v31-foryou-title" className="sr-only">
        For You
      </h2>

      <div className="home-v31-feed">
        {items.map((article) => {
          const reason =
            "reason" in article && typeof article.reason === "string"
              ? article.reason
              : undefined;
          return (
            <CompactCard
              key={article.id}
              headline={article.headline}
              excerpt={article.summary}
              imageUrl={article.imageUrl || article.ogImageUrl}
              imageAlt={article.headline}
              category={reason ?? article.categoryLabel}
              categoryVariant={reason ? "brand" : "default"}
              publishedAt={formatHomeTime(article.publishedAt, language)}
              readTime={article.readingTime}
              href={`/story/${article.slug}`}
            />
          );
        })}
      </div>
    </section>
  );
}
