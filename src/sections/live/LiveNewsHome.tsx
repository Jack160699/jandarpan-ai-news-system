import Link from "next/link";
import { LiveNewsCard } from "@/components/live/LiveNewsCard";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import {
  categoryLabel,
  liveArticleToCard,
} from "@/lib/live-news-display";
import type { LiveNewsFeed, NewsCategory } from "@/lib/types/news-article";
import { NEWS_INGEST_CATEGORIES } from "@/lib/types/news-article";

type LiveNewsHomeProps = {
  feed: LiveNewsFeed;
};

/**
 * Server-rendered live wire from Supabase.
 * Mirrors existing feed-section rhythm (hero → trending → categories → grid).
 */
export function LiveNewsHome({ feed }: LiveNewsHomeProps) {
  const hero = feed.hero ? liveArticleToCard(feed.hero) : null;
  const trending = feed.trending.map(liveArticleToCard);
  const latest = feed.latest.map(liveArticleToCard);

  return (
    <>
      {hero ? (
        <section
          id="top-news"
          className="news-scroll-target feed-section feed-section--flush"
        >
          <div className="feed-section__inner">
            <FeedSectionHeader title="Live wire" href="#live-latest" />
            <div className="home-hero">
              <div className="home-hero__main px-0">
                <LiveNewsCard
                  article={hero}
                  variant="featured"
                  priority
                  showExcerpt
                />
              </div>
              <div className="home-hero__side">
                {trending.slice(0, 3).map((item) => (
                  <LiveNewsCard key={item.id} article={item} variant="horizontal" />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {trending.length > 0 ? (
        <section className="feed-section bg-[var(--paper)]" aria-label="Trending live">
          <div className="feed-section__inner">
            <FeedSectionHeader title="Trending now" />
            <div className="trending-strip">
              {trending.map((item, i) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="trending-chip story-link tap-target"
                >
                  <span className="trending-chip__rank">{i + 1}</span>
                  <span className="truncate">{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {NEWS_INGEST_CATEGORIES.map((category) => (
        <LiveCategorySection
          key={category}
          category={category}
          articles={feed.byCategory[category] ?? []}
        />
      ))}

      <section
        id="live-latest"
        className="news-scroll-target feed-section bg-[var(--paper-elevated)]"
      >
        <div className="feed-section__inner">
          <FeedSectionHeader title="Latest headlines" href="#editorial" />
          <div className="feed-grid feed-grid--2 feed-grid--4">
            {latest.map((item, i) => (
              <LiveNewsCard
                key={item.id}
                article={item}
                variant="horizontal"
                priority={i < 2}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function LiveCategorySection({
  category,
  articles,
}: {
  category: NewsCategory;
  articles: LiveNewsFeed["byCategory"][NewsCategory];
}) {
  if (!articles.length) return null;

  const cards = articles.map(liveArticleToCard);
  const sectionId = category === "sports" ? "sports" : undefined;

  return (
    <section
      id={sectionId}
      className="feed-section bg-[var(--paper-elevated)]"
      data-category={category}
    >
      <div className="feed-section__inner">
        <FeedSectionHeader title={categoryLabel(category)} href="#live-latest" />
        <div
          className={`category-feed-grid ${
            cards.length > 1 ? "category-feed-grid--2" : ""
          }`}
        >
          {cards.map((item) => (
            <LiveNewsCard
              key={item.id}
              article={item}
              variant="horizontal"
              showExcerpt={cards.length === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
