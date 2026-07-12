"use client";

import Link from "next/link";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { CompactCard } from "@/design-system/components/editorial/CompactCard";
import { EmptyState } from "@/design-system/components/EmptyState";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";

type NearYouSectionProps = {
  districtSlug: string;
  districtName: string;
  districtNameHi: string;
  districtNews: HomeArticle[];
};

export function NearYouSection({
  districtSlug,
  districtName,
  districtNameHi,
  districtNews,
}: NearYouSectionProps) {
  const { language } = useLanguage();
  const districtLabel = pickBilingualLabel(language, districtName, districtNameHi);

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-labelledby="home-v31-near-title"
    >
      <SectionHeader
        title={pickBilingualLabel(language, `Near You · ${districtLabel}`, `आपके पास · ${districtLabel}`)}
        kicker={pickBilingualLabel(language, "Hyperlocal", "स्थानीय")}
        action={
          <Link
            href={`/district/${districtSlug}`}
            className="home-v31-link"
          >
            {pickBilingualLabel(language, "View all", "सभी देखें")}
          </Link>
        }
      />
      <h2 id="home-v31-near-title" className="sr-only">
        Near You
      </h2>

      {districtNews.length > 0 ? (
        <div className="home-v31-feed home-v31-feed--near">
          {districtNews.map((article) => (
            <CompactCard
              key={article.id}
              headline={article.headline}
              excerpt={article.summary}
              imageUrl={article.imageUrl || article.ogImageUrl}
              imageAlt={article.headline}
              district={districtLabel}
              publishedAt={formatHomeTime(article.publishedAt, language)}
              readTime={article.readingTime}
              href={`/story/${article.slug}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={pickBilingualLabel(
            language,
            "No local stories yet",
            "अभी कोई स्थानीय खबर नहीं"
          )}
          description={pickBilingualLabel(
            language,
            `We're gathering the latest from ${districtLabel}. Check back soon.`,
            `${districtLabel} की ताज़ा खबरें जल्द यहाँ होंगी।`
          )}
          icon="📍"
        />
      )}
    </section>
  );
}
