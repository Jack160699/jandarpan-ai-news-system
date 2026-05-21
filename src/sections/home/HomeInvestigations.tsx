import Link from "next/link";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import { HERO_FEED } from "@/lib/home-feed";

export function HomeInvestigations() {
  return (
    <section
      id="investigations"
      className="news-scroll-target feed-section bg-[var(--paper-warm)]"
    >
      <div className="feed-section__inner">
        <FeedSectionHeader
          title="Investigations"
          titleHi="खोज"
          href={`/story/${HERO_FEED.slug}`}
        />
        <NewsCard story={HERO_FEED} variant="horizontal" showExcerpt />
        <ul className="quick-read-list mt-1 border-t border-[var(--rule)] pt-1">
          <li className="quick-read-item">
            <Link href={`/story/${HERO_FEED.slug}`} className="quick-read-link story-link">
              <span className="quick-read-title">Part I · The gap in row 412</span>
              <span className="quick-read-time">Live</span>
            </Link>
          </li>
          <li className="quick-read-item">
            <Link href={`/story/${HERO_FEED.slug}`} className="quick-read-link story-link">
              <span className="quick-read-title">Part II · Permissions log</span>
              <span className="quick-read-time">1 hr</span>
            </Link>
          </li>
          <li className="quick-read-item">
            <Link href={`/story/${HERO_FEED.slug}`} className="quick-read-link story-link">
              <span className="quick-read-title">Part III · Backup surfaced</span>
              <span className="quick-read-time">2 hr</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
