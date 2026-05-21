"use client";

import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import { LIVE_STORIES } from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

export function LiveDeskFeed() {
  const { t } = useLanguage();

  return (
    <section className="feed-section bg-[var(--paper-warm)]" aria-label={t.home.liveDesk}>
      <div className="feed-section__inner">
        <FeedSectionHeader
          title={t.home.liveDesk}
          href="#breaking"
          actionLabel={t.home.wire}
        />
        <div className="live-desk-row">
          {LIVE_STORIES.map((story, i) => (
            <NewsCard
              key={story.slug}
              story={story}
              variant="horizontal"
              priority={i === 0}
              showExcerpt={i === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
