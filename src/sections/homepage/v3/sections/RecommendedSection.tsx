"use client";

import { SectionHeader } from "@/design-system/components/SectionHeader";
import { NewsCard } from "@/design-system/components/NewsCard";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import type { RecommendedArticle } from "@/lib/personalization/types";
import type { HomeArticle } from "@/lib/homepage/types";

type RecommendedSectionProps = {
  recommended: RecommendedArticle[];
  trendingFallback: HomeArticle[];
};

export function RecommendedSection({
  recommended,
  trendingFallback,
}: RecommendedSectionProps) {
  const { language } = useLanguage();
  const items = recommended.length > 0 ? recommended : trendingFallback;
  const isPersonalized = recommended.length > 0;

  if (!items.length) return null;

  return (
    <section
      className="home-v3__section home-v3__enter"
      aria-labelledby="home-v3-rec-title"
    >
      <SectionHeader
        title={isPersonalized ? "Recommended for You" : "Trending Now"}
        kicker={isPersonalized ? "Personalized" : "Popular"}
      />
      <h2 id="home-v3-rec-title" className="sr-only">
        Recommended
      </h2>

      <div className="flex flex-col gap-[var(--jds-space-md)]">
        {items.map((article) => {
          const reason =
            "reason" in article && typeof article.reason === "string"
              ? article.reason
              : undefined;
          return (
            <NewsCard
              key={article.id}
              headline={article.headline}
              excerpt={article.summary}
              imageUrl={article.imageUrl}
              category={reason ?? article.categoryLabel}
              categoryVariant={reason ? "brand" : "default"}
              publishedAt={formatHomeTime(article.publishedAt, language)}
              layout="horizontal"
              href={`/story/${article.slug}`}
            />
          );
        })}
      </div>
    </section>
  );
}
