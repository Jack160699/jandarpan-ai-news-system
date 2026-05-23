"use client";

import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { CardThumbnail } from "@/components/cards/CardThumbnail";
import {
  IMG_CARD_COMPACT,
  IMG_CARD_EDITORIAL,
  IMG_CARD_LEAD,
} from "@/lib/images/homepage-sizes";
import { useLocaleFormat } from "@/lib/i18n/hooks";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type NewsGridProps = {
  id?: string;
  title: string;
  articles: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

function NewsCard({
  article,
  variant,
  rank,
  showFresh,
}: {
  article: HomeArticle;
  variant: "lead" | "standard" | "compact";
  rank?: number;
  showFresh?: boolean;
}) {
  const { t } = useLanguage();
  const { time } = useLocaleFormat();
  const withImage = variant !== "compact";

  return (
    <article
      className={`news-card${variant === "lead" ? " news-card--lead" : ""}${variant === "compact" ? " news-card--compact" : ""}`}
    >
      <TrackedStoryLink
        href={`/story/${article.slug}`}
        slug={article.slug}
        category={article.section}
        region={article.section}
        surface="homepage"
        listPosition={rank}
        className="news-card__link"
      >
        {withImage ? (
          <div className="news-card__media">
            <CardThumbnail
              src={article.imageUrl}
              alt=""
              aspect="fill"
              category={article.tags[0] ?? article.section}
              overlay="none"
              sizes={variant === "lead" ? IMG_CARD_LEAD : IMG_CARD_EDITORIAL}
              badges={
                showFresh ? (
                  <span className="news-card__category">{t.home.fresh}</span>
                ) : undefined
              }
            />
          </div>
        ) : null}
        <h3 className="news-card__headline hi" lang={article.language === "hi" ? "hi" : undefined}>
          {article.headline}
        </h3>
        <div className="news-card__meta">
          <span className="news-card__category">{article.categoryLabel}</span>
          <span aria-hidden> · </span>
          <time dateTime={article.publishedAt}>{time(article.publishedAt)}</time>
        </div>
      </TrackedStoryLink>
    </article>
  );
}

export function NewsGrid({ id, title, articles, freshIds }: NewsGridProps) {
  if (!articles.length) return null;

  const [top, ...rest] = articles;

  return (
    <section
      id={id}
      className="news-grid pl-scroll-target"
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <header className="news-grid__header">
        <h2 id={id ? `${id}-title` : undefined} className="news-grid__title hi">
          {title}
        </h2>
      </header>
      <div className="news-grid__layout">
        <div className="news-grid__lead">
          <NewsCard
            article={top}
            variant="lead"
            rank={1}
            showFresh={freshIds?.has(top.id)}
          />
        </div>
        {rest.length > 0 ? (
          <ul className="news-grid__list" role="list">
            {rest.map((article, index) => (
              <li key={article.id}>
                <NewsCard article={article} variant="standard" rank={index + 2} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
