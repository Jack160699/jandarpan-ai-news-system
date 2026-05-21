"use client";

import Link from "next/link";
import { NewsImage } from "@/components/live/NewsImage";
import type { LiveCardModel } from "@/lib/live-news-display";
import { useLanguage } from "@/providers/LanguageProvider";

type LiveNewsCardProps = {
  article: LiveCardModel;
  variant?: "horizontal" | "featured" | "compact";
  priority?: boolean;
  showExcerpt?: boolean;
};

export function LiveNewsCard({
  article,
  variant = "horizontal",
  priority = false,
  showExcerpt = false,
}: LiveNewsCardProps) {
  const { t } = useLanguage();

  if (variant === "featured") {
    return (
      <article className="feed-card feed-card--featured">
        <Link
          href={article.href}
          className="story-link feed-card__link feed-card__link--featured tap-target group"
        >
          <div className="feed-card__media feed-card__media--featured">
            <NewsImage
              src={article.imageUrl}
              alt=""
              priority={priority}
              sizes="(max-width: 480px) 100vw, (max-width: 768px) 100vw, 60vw"
            />
          </div>
          <div className="feed-card__body">
            <div className="feed-card__meta-row">
              <span className="feed-card__category capitalize">
                {article.category}
              </span>
              <span className="feed-badge feed-badge--breaking">
                {t.common.breakingLabel}
              </span>
            </div>
            <h2 className="feed-card__title feed-card__title--featured">
              {article.title}
            </h2>
            {showExcerpt && article.excerpt ? (
              <p className="feed-card__excerpt line-clamp-2">{article.excerpt}</p>
            ) : null}
            <p className="feed-card__time">
              {article.source ? `${article.source} · ` : ""}
              {article.filedAt}
            </p>
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="feed-card feed-card--compact">
        <Link
          href={article.href}
          className="story-link feed-card__link feed-card__link--compact tap-target group"
        >
          <div className="feed-card__media feed-card__media--compact shrink-0">
            <NewsImage src={article.imageUrl} alt="" sizes="72px" />
          </div>
          <div className="feed-card__body min-w-0 flex-1 py-0.5">
            <span className="feed-card__category capitalize">
              {article.category}
            </span>
            <h3 className="feed-card__title feed-card__title--compact line-clamp-2">
              {article.title}
            </h3>
            <p className="feed-card__time">{article.filedAt}</p>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="feed-card feed-card--horizontal">
      <Link
        href={article.href}
        className="story-link feed-card__link feed-card__link--horizontal tap-target group"
      >
        <div className="feed-card__media feed-card__media--horizontal shrink-0">
          <NewsImage
            src={article.imageUrl}
            alt=""
            priority={priority}
            sizes="(max-width: 480px) 92px, 112px"
          />
        </div>
        <div className="feed-card__body min-w-0 flex-1">
          <div className="feed-card__meta-row">
            <span className="feed-card__category capitalize">
              {article.category}
            </span>
          </div>
          <h3 className="feed-card__title line-clamp-2">{article.title}</h3>
          {showExcerpt && article.excerpt ? (
            <p className="feed-card__excerpt line-clamp-1">{article.excerpt}</p>
          ) : null}
          <p className="feed-card__time">
            {article.source ? `${article.source} · ` : ""}
            {article.filedAt}
          </p>
        </div>
      </Link>
    </article>
  );
}
