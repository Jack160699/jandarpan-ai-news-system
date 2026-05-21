import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { TRENDING_STORIES } from "@/lib/home-feed";

export function TrendingStrip() {
  return (
    <section className="feed-section bg-[var(--paper)]" aria-label="Trending">
      <div className="feed-section__inner">
        <FeedSectionHeader title="Trending now" titleHi="ट्रेंडिंग" />
        <div className="trending-strip">
          {TRENDING_STORIES.map((story, i) => (
            <Link
              key={story.slug}
              href={`/story/${story.slug}`}
              className="trending-chip story-link"
            >
              <span className="trending-chip__rank">{i + 1}</span>
              <span className="truncate">{story.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
