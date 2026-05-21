"use client";

import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import { localizeFeedStory } from "@/lib/i18n/localize-content";
import { HERO_FEED } from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

export function HomeInvestigations() {
  const { language, t } = useLanguage();
  const heroLoc = localizeFeedStory(HERO_FEED, language);

  return (
    <section
      id="investigations"
      className="news-scroll-target feed-section bg-[var(--paper-warm)]"
    >
      <div className="feed-section__inner">
        <FeedSectionHeader
          title={t.home.investigations}
          href={`/story/${HERO_FEED.slug}`}
        />
        <NewsCard story={HERO_FEED} variant="horizontal" showExcerpt />
        <ul className="quick-read-list mt-1 border-t border-[var(--rule)] pt-1">
          <li className="quick-read-item">
            <Link
              href={`/story/${HERO_FEED.slug}`}
              className="quick-read-link story-link tap-target"
            >
              <span className="quick-read-title">
                {language === "en" ? "Part I · The gap in row 412" : "भाग I · पंक्ति 412"}
              </span>
              <span className="quick-read-time">{t.common.live}</span>
            </Link>
          </li>
          <li className="quick-read-item">
            <Link
              href={`/story/${HERO_FEED.slug}`}
              className="quick-read-link story-link tap-target"
            >
              <span className="quick-read-title">{heroLoc.title}</span>
              <span className="quick-read-time">1 hr</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
