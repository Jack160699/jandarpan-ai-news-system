"use client";

import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import { FeedListWithNativeAds } from "@/components/monetization/FeedListWithNativeAds";
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
        <div className="feed-grid feed-grid--2 feed-grid--4" role="list">
          <FeedListWithNativeAds
            items={ALL_FEED_STORIES}
            feedId="home-latest"
            itemWrapper="none"
            getKey={(story) => story.slug}
            renderItem={(story, i) => (
              <NewsCard
                story={story}
                variant="horizontal"
                priority={i < 2}
              />
            )}
          />
        </div>
      </div>
    </section>
  );
}
