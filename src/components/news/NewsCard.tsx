"use client";

import { FeedNewsCard } from "@/components/feed/FeedNewsCard";
import { localizeFeedStory } from "@/lib/i18n/localize-content";
import type { FeedStory } from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

type NewsCardProps = {
  story: FeedStory;
  variant?: "horizontal" | "featured" | "compact";
  priority?: boolean;
  showExcerpt?: boolean;
};

function storyCategory(story: FeedStory): string {
  return story.kicker.toLowerCase().replace(/\s+/g, "-") || "world";
}

/**
 * @deprecated Legacy news card — delegates to FeedNewsCard (design-system primitives inside).
 * Migrate to EditorialCard / CompactCard / FeaturedCard from @/design-system.
 */
export function NewsCard({
  story,
  variant = "horizontal",
  priority = false,
  showExcerpt = false,
}: NewsCardProps) {
  const { language } = useLanguage();
  const localized = localizeFeedStory(story, language);
  const category = storyCategory(story);

  const feedVariant =
    variant === "featured" ? "lead" : variant === "compact" ? "compact" : "standard";

  return (
    <FeedNewsCard
      articleId={story.slug}
      slug={story.slug}
      headline={localized.title}
      summary={localized.excerpt}
      imageUrl={story.image}
      categoryLabel={localized.kicker}
      publishedLabel={story.filedAt}
      readingTime={story.readTime}
      section={category}
      imageCategory={category}
      variant={feedVariant}
      priority={priority}
      showSummary={showExcerpt || variant === "featured"}
      isLive={story.isLive}
      isBreaking={story.isBreaking}
      surface="homepage"
    />
  );
}
