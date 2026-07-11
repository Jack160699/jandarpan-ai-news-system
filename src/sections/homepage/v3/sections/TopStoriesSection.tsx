"use client";

import { SectionHeader } from "@/design-system/components/SectionHeader";
import { NewsCard } from "@/design-system/components/NewsCard";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import type { TieredStory } from "../hooks/useHomeV3Data";

type TopStoriesSectionProps = {
  stories: TieredStory[];
};

export function TopStoriesSection({ stories }: TopStoriesSectionProps) {
  const { language } = useLanguage();

  if (!stories.length) return null;

  return (
    <section className="home-v3__section home-v3__enter" aria-labelledby="home-v3-top-title">
      <SectionHeader title="Top Stories" kicker="Editorial" />
      <h2 id="home-v3-top-title" className="sr-only">
        Top Stories
      </h2>

      <div className="home-v3-top-grid">
        {stories.map((story) => {
          const layout =
            story.tier === "hero" || story.tier === "featured"
              ? "vertical"
              : "horizontal";
          const className =
            story.tier === "hero"
              ? "home-v3-top-grid__hero"
              : story.tier === "featured"
                ? "home-v3-top-grid__featured"
                : undefined;

          return (
            <NewsCard
              key={story.id}
              className={className}
              headline={story.headline}
              excerpt={story.tier !== "compact" ? story.summary : undefined}
              imageUrl={story.imageUrl || story.ogImageUrl}
              imageAlt={story.headline}
              category={story.categoryLabel}
              publishedAt={formatHomeTime(story.publishedAt, language)}
              readTime={story.readingTime}
              layout={layout}
              href={`/story/${story.slug}`}
            />
          );
        })}
      </div>
    </section>
  );
}
