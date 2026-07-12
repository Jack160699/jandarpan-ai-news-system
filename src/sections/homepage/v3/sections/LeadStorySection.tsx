"use client";

import { AtlasHeroCard } from "../components/AtlasHeroCard";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";

type LeadStorySectionProps = {
  story: HomeArticle & { isBreaking?: boolean };
};

export function LeadStorySection({ story }: LeadStorySectionProps) {
  const { language } = useLanguage();
  const isBreaking = story.isBreaking || story.ranking?.isBreaking;

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-labelledby="home-atlas-lead-title"
    >
      <AtlasHeroCard
        headline={story.headline}
        summary={story.summary}
        imageUrl={story.imageUrl || story.ogImageUrl}
        imageAlt={story.headline}
        category={
          isBreaking
            ? pickBilingualLabel(language, "Breaking", "ताज़ा")
            : story.categoryLabel
        }
        publishedAt={formatHomeTime(story.publishedAt, language)}
        readingTime={story.readingTime}
        href={`/story/${story.slug}`}
        priority
      />

      <h2 id="home-atlas-lead-title" className="sr-only">
        {story.headline}
      </h2>
    </section>
  );
}
