"use client";

import { HeroCard } from "@/design-system/components/HeroCard";
import { AISummary } from "@/design-system/components/AISummary";
import { formatHomeTime, confidenceLabel } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";

type LeadStorySectionProps = {
  story: HomeArticle & { isBreaking?: boolean };
  aiInsight: string | null;
};

export function LeadStorySection({ story, aiInsight }: LeadStorySectionProps) {
  const { language } = useLanguage();
  const isBreaking = story.isBreaking || story.ranking?.isBreaking;

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-labelledby="home-v31-lead-title"
    >
      <HeroCard
        className="home-v31-lead"
        headline={story.headline}
        summary={story.summary}
        imageUrl={story.imageUrl || story.ogImageUrl}
        imageAlt={story.headline}
        category={
          isBreaking
            ? pickBilingualLabel(language, "Breaking", "ताज़ा")
            : story.categoryLabel
        }
        categoryVariant={isBreaking ? "breaking" : "default"}
        publishedAt={formatHomeTime(story.publishedAt, language)}
        href={`/story/${story.slug}`}
        priority
      />

      <h2 id="home-v31-lead-title" className="sr-only">
        {story.headline}
      </h2>

      {aiInsight ? (
        <AISummary
          summary={aiInsight}
          label={pickBilingualLabel(language, "Editor's summary", "संक्षिप्त सार")}
          className="home-v31-lead__ai"
        />
      ) : null}

      <p className="home-v31-lead__trust">
        <span>{confidenceLabel(story.aiConfidence)}</span>
        <span aria-hidden>·</span>
        <span>
          {story.sourceCount}{" "}
          {pickBilingualLabel(language, "sources", "स्रोत")}
        </span>
        {story.readingTime ? (
          <>
            <span aria-hidden>·</span>
            <span>{story.readingTime}</span>
          </>
        ) : null}
      </p>
    </section>
  );
}
