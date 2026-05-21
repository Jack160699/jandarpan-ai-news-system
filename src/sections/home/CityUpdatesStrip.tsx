"use client";

import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { localizeFeedStory } from "@/lib/i18n/localize-content";
import { CITY_UPDATES } from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

const CITY_KEYS: Record<string, "raipur" | "bastar" | "bhilai"> = {
  Raipur: "raipur",
  Bastar: "bastar",
  Bhilai: "bhilai",
};

export function CityUpdatesStrip() {
  const { language, t } = useLanguage();

  return (
    <section className="feed-section bg-[var(--paper)]" aria-label={t.home.cityUpdates}>
      <div className="feed-section__inner">
        <FeedSectionHeader title={t.home.cityUpdates} />
        <div className="city-updates-grid">
          {CITY_UPDATES.map((block) => {
            const key = CITY_KEYS[block.city];
            const cityLabel = key ? t.home.cities[key] : block.city;
            return (
              <div key={block.city}>
                <p className="city-block__label">{cityLabel}</p>
                <ul className="quick-read-list">
                  {block.stories.map((story) => {
                    const loc = localizeFeedStory(story, language);
                    return (
                      <li key={story.slug} className="quick-read-item">
                        <Link
                          href={`/story/${story.slug}`}
                          className="quick-read-link story-link tap-target"
                        >
                          <span className="quick-read-title line-clamp-2">
                            {loc.title}
                          </span>
                          <span className="quick-read-time">{story.filedAt}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
