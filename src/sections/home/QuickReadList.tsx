"use client";

import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { localizeFeedStory } from "@/lib/i18n/localize-content";
import { QUICK_READ_SLUGS, getFeedStory } from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

export function QuickReadList() {
  const { language, t } = useLanguage();
  const items = QUICK_READ_SLUGS.map((slug) => getFeedStory(slug)).filter(Boolean);

  return (
    <section className="feed-section bg-[var(--paper)]" aria-label={t.home.quickRead}>
      <div className="feed-section__inner">
        <FeedSectionHeader title={t.home.quickRead} />
        <ul className="quick-read-list">
          {items.map((story) => {
            const loc = localizeFeedStory(story!, language);
            return (
              <li key={story!.slug} className="quick-read-item">
                <Link
                  href={`/story/${story!.slug}`}
                  className="quick-read-link story-link tap-target"
                >
                  <span className="quick-read-title">{loc.title}</span>
                  <span className="quick-read-time">{story!.filedAt}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
