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

export type StoryCardVariant =
  | "editorial-lead"
  | "editorial"
  | "wire"
  | "breaking"
  | "compact"
  | "trending";

type StoryCardProps = {
  article: HomeArticle;
  variant: StoryCardVariant;
  priority?: boolean;
  rank?: number;
  showFreshBadge?: boolean;
};

function showImage(variant: StoryCardVariant): boolean {
  return variant !== "wire";
}

export function StoryCard({
  article,
  variant,
  priority = false,
  rank,
  showFreshBadge = false,
}: StoryCardProps) {
  const { t } = useLanguage();
  const { time } = useLocaleFormat();
  const hasImage = showImage(variant);
  const showSummary =
    variant === "editorial-lead" || variant === "editorial";

  return (
    <article
      className={`bh-card nr-card nr-card--daily nr-card--${variant}`}
    >
      <TrackedStoryLink
        href={`/story/${article.slug}`}
        slug={article.slug}
        category={article.section}
        region={article.section}
        surface={variant === "breaking" ? "breaking" : "homepage"}
        listPosition={rank}
        className="nr-card__link tap-target motion-press"
        prefetch={priority ? undefined : false}
      >
        {hasImage ? (
          <div className="nr-card__media">
            <CardThumbnail
              src={article.imageUrl}
              alt=""
              aspect="fill"
              category={article.tags[0] ?? article.section}
              overlay="none"
              priority={priority}
              sizes={
                variant === "editorial-lead"
                  ? IMG_CARD_LEAD
                  : variant === "compact"
                    ? IMG_CARD_COMPACT
                    : IMG_CARD_EDITORIAL
              }
              badges={
                showFreshBadge ? (
                  <span className="pcard__flag pcard__flag--fresh">
                    {t.home.fresh}
                  </span>
                ) : article.ranking.isBreaking || variant === "breaking" ? (
                  <span className="pcard__flag pcard__flag--breaking">
                    {t.common.breakingLabel}
                  </span>
                ) : article.isLive ? (
                  <span className="pcard__flag pcard__flag--live">
                    {t.common.live}
                  </span>
                ) : null
              }
            />
          </div>
        ) : null}

        <div className="nr-card__body">
          {typeof rank === "number" && variant === "trending" ? (
            <span className="nr-card__rank">{rank}</span>
          ) : null}

          <h3 className="nr-card__headline">{article.headline}</h3>

          {showSummary && article.summary ? (
            <p className="nr-card__summary">{article.summary}</p>
          ) : null}

          <p className="nr-card__meta">
            <span>{article.categoryLabel}</span>
            <span aria-hidden> · </span>
            <time dateTime={article.publishedAt}>
              {time(article.publishedAt)}
            </time>
          </p>
        </div>
      </TrackedStoryLink>
    </article>
  );
}
