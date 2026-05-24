"use client";

import { FeedNewsCard } from "@/components/feed/FeedNewsCard";
import { FeedListWithNativeAds } from "@/components/monetization/FeedListWithNativeAds";
import { feedRhythmLayout } from "@/lib/feed/rhythm";
import type { HomeArticle } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

type NewsGridProps = {
  id?: string;
  title: string;
  articles: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export function NewsGrid({ id, title, articles, freshIds }: NewsGridProps) {
  const { t } = useLanguage();
  if (!articles.length) return null;

  const [top, ...rest] = articles;
  const feedId = id ?? "trending";

  return (
    <section
      id={id}
      className="news-grid feed-section pl-scroll-target"
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <header className="news-grid__header">
        <h2 id={id ? `${id}-title` : undefined} className="news-grid__title hi">
          {title}
        </h2>
      </header>
      <div className="news-grid__layout">
        <div className="news-grid__lead">
          <FeedNewsCard
            articleId={top.id}
            slug={top.slug}
            headline={top.headline}
            summary={top.summary}
            imageUrl={top.imageUrl}
            categoryLabel={top.categoryLabel}
            publishedAt={top.publishedAt}
            readingTime={top.readingTime}
            language={top.language}
            section={top.section}
            imageCategory={top.tags[0] ?? top.section}
            variant="lead"
            priority
            rank={1}
            showSummary
            isLive={top.isLive}
            isBreaking={top.ranking.isBreaking}
            badge={freshIds?.has(top.id) ? t.home.fresh : undefined}
            langHint={top.language === "hi" ? "hi-IN" : "auto"}
            index={0}
          />
        </div>
        {rest.length > 0 ? (
          <ul className="news-grid__list feed-rhythm-list" role="list">
            <FeedListWithNativeAds
              items={rest}
              feedId={feedId}
              getKey={(article) => article.id}
              renderItem={(article, index) => {
                const rhythm = feedRhythmLayout(index);
                return (
                  <FeedNewsCard
                    articleId={article.id}
                    slug={article.slug}
                    headline={article.headline}
                    summary={article.summary}
                    imageUrl={article.imageUrl}
                    categoryLabel={article.categoryLabel}
                    publishedAt={article.publishedAt}
                    readingTime={article.readingTime}
                    language={article.language}
                    section={article.section}
                    imageCategory={article.tags[0] ?? article.section}
                    variant="standard"
                    rhythm={rhythm}
                    rank={index + 2}
                    isLive={article.isLive}
                    isBreaking={article.ranking.isBreaking}
                    langHint={article.language === "hi" ? "hi-IN" : "auto"}
                    listPosition={index + 2}
                    index={index + 1}
                  />
                );
              }}
            />
          </ul>
        ) : null}
      </div>
    </section>
  );
}
