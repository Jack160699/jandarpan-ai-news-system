"use client";

import { HeroCard } from "@/design-system/components/HeroCard";
import { formatHomeTime, confidenceLabel } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type BreakingStorySectionProps = {
  story: HomeArticle;
};

export function BreakingStorySection({ story }: BreakingStorySectionProps) {
  const { language } = useLanguage();

  return (
    <section
      className="home-v3__section home-v3__enter"
      aria-labelledby="home-v3-breaking-title"
    >
      <HeroCard
        className="home-v3-breaking"
        headline={story.headline}
        summary={story.summary}
        imageUrl={story.imageUrl || story.ogImageUrl}
        imageAlt={story.headline}
        category="Breaking"
        categoryVariant="breaking"
        publishedAt={formatHomeTime(story.publishedAt, language)}
        href={`/story/${story.slug}`}
      />
      <div className="flex flex-wrap gap-[var(--jds-space-md)] text-[var(--jds-text-caption)] text-[var(--jds-color-text-tertiary)]">
        <span>{confidenceLabel(story.aiConfidence)} confidence</span>
        <span aria-hidden>·</span>
        <span>{story.sourceCount} sources</span>
        <span aria-hidden>·</span>
        <span>{story.categoryLabel}</span>
      </div>
      <h2 id="home-v3-breaking-title" className="sr-only">
        Breaking story: {story.headline}
      </h2>
    </section>
  );
}
