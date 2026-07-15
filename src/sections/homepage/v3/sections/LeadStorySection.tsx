"use client";

import { AtlasHeroCard } from "../components/AtlasHeroCard";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";

type LeadStorySectionProps = {
  story: HomeArticle & { isBreaking?: boolean };
  districtLabel?: string;
};

export function LeadStorySection({ story, districtLabel }: LeadStorySectionProps) {
  const { language } = useLanguage();
  const isBreaking = story.isBreaking || story.ranking?.isBreaking;

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-label={pickBilingualLabel(language, "Lead story", "मुख्य खबर")}
    >
      <AtlasHeroCard
        headline={story.headline}
        summary={story.summary}
        imageUrl={story.imageUrl || story.ogImageUrl}
        imageAlt={story.headline}
        article={story}
        language={language}
        districtLabel={districtLabel}
        category={
          isBreaking
            ? pickBilingualLabel(language, "Breaking", "ताज़ा")
            : story.categoryLabel
        }
        href={`/story/${story.slug}`}
        priority
      />
    </section>
  );
}
