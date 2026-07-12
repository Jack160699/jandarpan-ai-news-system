"use client";

import { SectionHeader } from "@/design-system/components/SectionHeader";
import { CompactCard } from "@/design-system/components/editorial/CompactCard";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";

type StoryFeedSectionProps = {
  stories: HomeArticle[];
};

export function StoryFeedSection({ stories }: StoryFeedSectionProps) {
  const { language } = useLanguage();

  if (!stories.length) return null;

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-labelledby="home-v31-feed-title"
    >
      <SectionHeader
        title={pickBilingualLabel(language, "More Stories", "और खबरें")}
        kicker={pickBilingualLabel(language, "Feed", "फ़ीड")}
      />
      <h2 id="home-v31-feed-title" className="sr-only">
        More Stories
      </h2>

      <div className="home-v31-feed">
        {stories.map((story) => (
          <CompactCard
            key={story.id}
            headline={story.headline}
            excerpt={story.summary}
            imageUrl={story.imageUrl || story.ogImageUrl}
            imageAlt={story.headline}
            category={story.categoryLabel}
            publishedAt={formatHomeTime(story.publishedAt, language)}
            readTime={story.readingTime}
            href={`/story/${story.slug}`}
          />
        ))}
      </div>
    </section>
  );
}
