"use client";

import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import { ALL_FEED_STORIES } from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

export function HomeNewsGrid() {
  const { t } = useLanguage();

  return (
    <section
      id="editorial"
      className="news-scroll-target feed-section bg-[var(--paper-elevated)]"
    >
      <div className="feed-section__inner">
        <FeedSectionHeader title={t.home.latestNews} href="#editorial" />
        <div className="feed-grid feed-grid--2 feed-grid--4">
          {ALL_FEED_STORIES.map((story, i) => (
            <NewsCard
              key={story.slug}
              story={story}
              variant="horizontal"
              priority={i < 2}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
