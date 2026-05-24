"use client";

import { memo } from "react";
import { ArticleCardActions } from "@/components/article/ArticleCardActions";
import { PremiumLiveCard } from "@/components/cards/PremiumLiveCard";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { BreakingBadge } from "@/components/homepage/BreakingBadge";
import { formatHomeTime } from "@/lib/homepage/format";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveUpdateCardProps = {
  article: HomeArticle;
  variant?: "wire" | "breaking";
  rank?: number;
  listPosition?: number;
};

function isJustIn(article: HomeArticle): boolean {
  const hours =
    (Date.now() - new Date(article.publishedAt).getTime()) / 3_600_000;
  return (
    hours < 3 &&
    (article.ranking.isBreaking ||
      article.isLive ||
      article.urgency === "high")
  );
}

export const LiveUpdateCard = memo(function LiveUpdateCard({
  article,
  variant = "wire",
  rank,
  listPosition,
}: LiveUpdateCardProps) {
  const justIn = isJustIn(article);
  const showLive = article.isLive;
  const showBreaking = article.ranking.isBreaking && !showLive;

  return (
    <PremiumLiveCard variant={variant}>
    <article className={`live-card live-card--${variant}`}>
      <TrackedStoryLink
        href={`/story/${article.slug}`}
        slug={article.slug}
        category={article.section}
        region={article.section}
        surface={variant === "breaking" ? "breaking" : "homepage"}
        listPosition={listPosition}
        className="live-card__link tap-target"
      >
        <div className="live-card__rail" aria-hidden>
          <span className="live-card__pulse" />
        </div>

        <div className="live-card__main">
          <div className="live-card__meta-row">
            <time
              className="live-card__time"
              dateTime={article.publishedAt}
            >
              {formatHomeTime(article.publishedAt)}
            </time>
            {typeof rank === "number" ? (
              <span className="live-card__rank">{String(rank).padStart(2, "0")}</span>
            ) : null}
            <div className="live-card__badges">
              {showLive ? <BreakingBadge variant="live" /> : null}
              {justIn ? <BreakingBadge variant="just-in" /> : null}
              {showBreaking ? <BreakingBadge variant="breaking" /> : null}
              {article.urgency === "high" && !justIn && !showLive ? (
                <BreakingBadge variant="urgent" />
              ) : null}
            </div>
          </div>

          <h3
            className="live-card__headline"
            lang={article.language === "hi" ? "hi" : undefined}
          >
            {article.headline}
          </h3>

          {article.summary && variant === "breaking" ? (
            <p className="live-card__deck">{article.summary}</p>
          ) : null}

          <p className="live-card__source">
            {article.categoryLabel}
            <span aria-hidden> · </span>
            {article.desk.name}
            {article.sourceCount > 1 ? (
              <>
                <span aria-hidden> · </span>
                {article.sourceCount} sources
              </>
            ) : null}
          </p>
        </div>
      </TrackedStoryLink>
      <ArticleCardActions
        articleId={article.id}
        headline={article.headline}
        summary={article.summary}
        slugOrPath={article.slug}
        langHint={article.language === "hi" ? "hi-IN" : "auto"}
      />
    </article>
    </PremiumLiveCard>
  );
});
