import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { QUICK_READ_SLUGS, getFeedStory } from "@/lib/home-feed";

export function QuickReadList() {
  const items = QUICK_READ_SLUGS.map((slug) => getFeedStory(slug)).filter(
    Boolean
  );

  return (
    <section className="feed-section bg-[var(--paper)]" aria-label="Quick read">
      <div className="feed-section__inner">
        <FeedSectionHeader title="Quick read" titleHi="झटपट पढ़ें" />
        <ul className="quick-read-list">
          {items.map((story) => (
            <li key={story!.slug} className="quick-read-item">
              <Link
                href={`/story/${story!.slug}`}
                className="quick-read-link story-link"
              >
                <span className="quick-read-title">{story!.title}</span>
                <span className="quick-read-time">{story!.filedAt}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
