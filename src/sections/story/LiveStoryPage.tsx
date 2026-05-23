import Link from "next/link";
import { LiveNewsCard } from "@/components/live/LiveNewsCard";
import { NewsImage } from "@/components/live/NewsImage";
import { LiveStoryJsonLd } from "@/components/seo/LiveStoryJsonLd";
import { ReaderAnalyticsTracker } from "@/components/analytics/ReaderAnalyticsTracker";
import { StoryReadingProgress } from "@/components/story/StoryReadingProgress";
import { StoryShareRail } from "@/components/story/StoryShareRail";
import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import {
  categoryLabel,
  liveArticleToCard,
} from "@/lib/live-news-display";
import { isArticleLive } from "@/lib/news/home-ranking";
import { extractTopicTrends } from "@/lib/news/home-ranking";
import { resolveStorySlug } from "@/lib/news/related-stories";
import { resolveCardImage } from "@/lib/news/images/display";
import { SITE_URL } from "@/lib/seo";
import {
  bilingualMiniSummary,
  estimateReadTime,
  storyBodyParagraphs,
  whyThisMatters,
} from "@/lib/news/story-utils";
import { formatPublishedAt } from "@/lib/news-db";
import { BRAND } from "@/lib/brand";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";

type LiveStoryPageProps = {
  article: NewsArticleRow;
  related: NewsArticleRow[];
  topicPool: NewsArticleRow[];
};

export function LiveStoryPage({
  article,
  related,
  topicPool,
}: LiveStoryPageProps) {
  const slug = resolveStorySlug(article);
  const canonicalUrl = `${SITE_URL}/story/${slug}`;
  const category = article.category as NewsCategory;
  const heroImage = resolveCardImage(
    {
      imageUrl: article.image_url,
      category: article.category,
      source: article.source,
      articleUrl: article.article_url,
    },
    1200
  );

  const isLive = isArticleLive(article.published_at);
  const readTime = estimateReadTime(
    `${article.title} ${article.content ?? article.description ?? ""}`
  );
  const paragraphs = storyBodyParagraphs(article);
  const why = whyThisMatters(article);
  const bilingual = bilingualMiniSummary(article);
  const topicTrends = extractTopicTrends(topicPool, 6);
  const slugById = new Map(
    topicPool.map((a) => [a.id, resolveStorySlug(a)])
  );
  const relatedCards = related.map(liveArticleToCard);

  const regionLabel =
    article.region === "chhattisgarh"
      ? "Chhattisgarh"
      : article.region === "india"
        ? "India"
        : "Global";

  return (
    <>
      <LiveStoryJsonLd article={article} />
      <ReaderAnalyticsTracker
        slug={slug}
        category={article.category}
        region={article.region}
        surface="story"
      />
      <StoryReadingProgress />

      <article className="story-page" data-reading="article">
        <div className="editorial-container">
          <div className="story-page__toolbar">
            <Link href="/" className="story-page__back tap-target">
              ← Back to live edition
            </Link>
            {article.article_url ? (
              <a
                href={article.article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="meta-label text-[var(--accent-category)] tap-target"
              >
                Original source ↗
              </a>
            ) : null}
          </div>

          <header>
            <div className="story-meta-bar">
              <span>{categoryLabel(category)}</span>
              <span aria-hidden>·</span>
              <span>{regionLabel}</span>
              {isLive ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="feed-badge feed-badge--live">
                    <span className="feed-badge__dot" aria-hidden />
                    LIVE
                  </span>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <span>{readTime}</span>
            </div>

            <h1 className="story-headline">{article.title}</h1>

            {article.description ? (
              <p className="story-deck">{article.description}</p>
            ) : null}

            <div className="story-meta-bar">
              {article.source ? <span>{article.source}</span> : null}
              {article.author ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{article.author}</span>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <time dateTime={article.published_at ?? undefined}>
                {formatPublishedAt(article.published_at)}
              </time>
              <span aria-hidden>·</span>
              <span>{BRAND.nameEn} live desk</span>
            </div>
          </header>

          <figure className="story-hero__media my-6">
            <NewsImage
              src={heroImage}
              alt=""
              priority
              sizes="(max-width: 768px) 100vw, 72rem"
              width={1200}
            />
          </figure>

          <div className="story-layout">
            <div className="story-layout__main">
              <div className="story-ai-block">
                <p className="story-ai-block__label">Summary</p>
                <p>{article.ai_summary ?? article.description ?? why}</p>
              </div>

              <div className="story-ai-block">
                <p className="story-ai-block__label">Why this matters</p>
                <p>{why}</p>
              </div>

              <div className="story-bilingual">
                <div>
                  <p className="story-ai-block__label">English</p>
                  <p>{bilingual.en}</p>
                </div>
                <div className="story-bilingual__hi">
                  <p className="story-ai-block__label">हिंदी</p>
                  <p>{bilingual.hi}</p>
                </div>
              </div>

              <div className="story-prose">
                {paragraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              {topicTrends.length > 0 ? (
                <section className="story-related" aria-label="Trending topics">
                  <FeedSectionHeader title="Trending now" href="/" />
                  <div className="trending-strip">
                    {topicTrends.map((t, i) => (
                      <Link
                        key={t.topic}
                        href={`/story/${slugById.get(t.articleId) ?? ""}`}
                        className="trending-chip story-link tap-target"
                      >
                        <span className="trending-chip__rank">{i + 1}</span>
                        <span className="truncate capitalize">{t.topic}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {relatedCards.length > 0 ? (
                <section className="story-related">
                  <FeedSectionHeader title="Related stories" href="/" />
                  <div className="feed-grid feed-grid--2">
                    {relatedCards.map((card) => (
                      <LiveNewsCard
                        key={card.id}
                        article={card}
                        variant="horizontal"
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="story-layout__rail">
              <StoryShareRail url={canonicalUrl} title={article.title} />
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
