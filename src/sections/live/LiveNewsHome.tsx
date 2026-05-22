import Link from "next/link";
import { HomeLiveRefresh } from "@/components/live/HomeLiveRefresh";
import { LiveNewsCard } from "@/components/live/LiveNewsCard";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import {
  categoryLabel,
  liveArticleToCard,
} from "@/lib/live-news-display";
import { resolveStorySlug } from "@/lib/news/related-stories";
import { storyPath } from "@/lib/news/slug";
import type { LiveNewsFeed, NewsArticleRow, NewsCategory } from "@/lib/types/news-article";
import { NEWS_INGEST_CATEGORIES } from "@/lib/types/news-article";

type LiveNewsHomeProps = {
  feed: LiveNewsFeed;
};

export function LiveNewsHome({ feed }: LiveNewsHomeProps) {
  const hero = feed.hero ? liveArticleToCard(feed.hero) : null;
  const justIn = feed.justIn.map(liveArticleToCard);
  const trending = feed.trending.map(liveArticleToCard);
  const latest = feed.latest.map(liveArticleToCard);
  const topicTrends = feed.topicTrends;
  const slugById = buildSlugMap(feed);

  return (
    <>
      <HomeLiveRefresh />

      {hero ? (
        <section
          id="top-news"
          className="news-scroll-target feed-section feed-section--flush"
        >
          <div className="feed-section__inner">
            <FeedSectionHeader
              title="Live wire"
              href="#just-in"
              meta={`${feed.analytics.live_articles_count} live · ${feed.analytics.regional_percentage}% regional`}
            />
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
                  <LiveNewsCard
                    key={item.id}
                    article={item}
                    variant="horizontal"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {justIn.length > 0 ? (
        <section
          id="just-in"
          className="news-scroll-target feed-section bg-[var(--paper)]"
          aria-label="Just in"
        >
          <div className="feed-section__inner">
            <FeedSectionHeader title="Just in — Chhattisgarh" href="#top-news" />
            <div className="feed-grid feed-grid--2">
              {justIn.map((item, i) => (
                <LiveNewsCard
                  key={item.id}
                  article={item}
                  variant={i < 2 ? "horizontal" : "compact"}
                  priority={i < 2}
                  showExcerpt={i === 0}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {topicTrends.length > 0 ? (
        <section className="feed-section bg-[var(--paper-elevated)]" aria-label="Trending topics">
          <div className="feed-section__inner">
            <FeedSectionHeader title="Trending topics (3h)" />
            <div className="trending-strip">
              {topicTrends.map((t, i) => (
                <Link
                  key={`${t.topic}-${t.articleId}`}
                  href={storyPath(slugById.get(t.articleId) ?? t.topic)}
                  className="trending-chip story-link tap-target"
                >
                  <span className="trending-chip__rank">{i + 1}</span>
                  <span className="truncate capitalize">{t.topic}</span>
                  <span className="text-[10px] opacity-70">({t.count})</span>
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
          <FeedSectionHeader title="Latest headlines" href="#top-news" />
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

function buildSlugMap(feed: LiveNewsFeed): Map<string, string> {
  const articles: NewsArticleRow[] = [];
  if (feed.hero) articles.push(feed.hero);
  articles.push(
    ...feed.trending,
    ...feed.justIn,
    ...feed.latest,
    ...Object.values(feed.byCategory).flat()
  );
  return new Map(articles.map((a) => [a.id, resolveStorySlug(a)]));
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
        <FeedSectionHeader
          title={categoryLabel(category)}
          href="#live-latest"
        />
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
