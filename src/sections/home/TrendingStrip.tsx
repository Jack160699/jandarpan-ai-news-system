"use client";

import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { localizeFeedStory } from "@/lib/i18n/localize-content";
import { TRENDING_STORIES } from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

export function TrendingStrip() {
  const { language, t } = useLanguage();

  return (
    <section className="feed-section bg-[var(--paper)]" aria-label={t.home.trending}>
      <div className="feed-section__inner">
        <FeedSectionHeader title={t.home.trending} />
        <div className="trending-strip">
          {TRENDING_STORIES.map((story, i) => {
            const loc = localizeFeedStory(story, language);
            return (
              <Link
                key={story.slug}
                href={`/story/${story.slug}`}
                className="trending-chip story-link tap-target"
              >
                <span className="trending-chip__rank">{i + 1}</span>
                <span className="truncate">{loc.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
