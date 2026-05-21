import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import { LIVE_STORIES } from "@/lib/home-feed";

export function LiveDeskFeed() {
  return (
    <section className="feed-section bg-[var(--paper-warm)]" aria-label="Live updates">
      <div className="feed-section__inner">
        <FeedSectionHeader
          title="Live desk"
          titleHi="लाइव अपडेट"
          href="#breaking"
          actionLabel="Wire"
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
