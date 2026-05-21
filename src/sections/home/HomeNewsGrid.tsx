import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import { ALL_FEED_STORIES } from "@/lib/home-feed";

export function HomeNewsGrid() {
  return (
    <section
      id="editorial"
      className="news-scroll-target feed-section bg-[var(--paper-elevated)]"
    >
      <div className="feed-section__inner">
        <FeedSectionHeader
          title="Latest updates"
          titleHi="ताज़ा अपडेट"
          href="#editorial"
        />
        <div className="feed-grid feed-grid--2 feed-grid--4">
          {ALL_FEED_STORIES.map((story, i) => (
            <NewsCard
              key={story.slug}
              story={story}
              variant="horizontal"
              priority={i < 2}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
