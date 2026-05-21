import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { CITY_UPDATES } from "@/lib/home-feed";

export function CityUpdatesStrip() {
  return (
    <section className="feed-section bg-[var(--paper)]" aria-label="City updates">
      <div className="feed-section__inner">
        <FeedSectionHeader title="City desks" titleHi="शहर" />
        <div className="city-updates-grid">
          {CITY_UPDATES.map((block) => (
            <div key={block.city}>
              <p className="city-block__label">
                {block.cityHi} · {block.city}
              </p>
              <ul className="quick-read-list">
                {block.stories.map((story) => (
                  <li key={story.slug} className="quick-read-item">
                    <Link
                      href={`/story/${story.slug}`}
                      className="quick-read-link story-link"
                    >
                      <span className="quick-read-title line-clamp-2">
                        {story.title}
                      </span>
                      <span className="quick-read-time">{story.filedAt}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
