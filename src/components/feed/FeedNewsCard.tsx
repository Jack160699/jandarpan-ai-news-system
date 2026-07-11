"use client";

import { type CSSProperties } from "react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { HeroCardActions } from "@/components/layout/HeroCardActions";
import { MediaImage } from "@/components/media/MediaImage";
import {
  IMG_CARD_COMPACT,
  IMG_CARD_EDITORIAL,
  IMG_CARD_FEED,
  IMG_CARD_LEAD,
} from "@/lib/images/homepage-sizes";
import type { AnalyticsSurface } from "@/lib/analytics/types";
import { useLocaleFormat } from "@/lib/i18n/hooks";
import {
  feedVariantForRhythm,
  type FeedRhythmLayout,
} from "@/lib/feed/rhythm";
import type { SpeechLangHint } from "@/lib/speech/voice-utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useLanguage } from "@/providers/LanguageProvider";

export type FeedNewsCardVariant = "standard" | "compact" | "lead";

export type FeedNewsCardProps = {
  articleId: string;
  slug: string;
  headline: string;
  summary?: string;
  imageUrl?: string;
  categoryLabel: string;
  publishedAt?: string;
  publishedLabel?: string;
  readingTime?: string;
  language?: string;
  section: string;
  imageCategory?: string;
  variant?: FeedNewsCardVariant;
  priority?: boolean;
  rank?: number;
  showSummary?: boolean;
  langHint?: SpeechLangHint;
  surface?: AnalyticsSurface;
  listPosition?: number;
  isLive?: boolean;
  isBreaking?: boolean;
  badge?: string;
  index?: number;
  /** When > 0 with a summary, shows editorial AI chip */
  aiConfidence?: number;
  /** Override default `/story/{slug}` link (e.g. live desk routes) */
  href?: string;
  sourceLabel?: string;
  /** Visual rhythm beat — emphasis / compact alternation */
  rhythm?: FeedRhythmLayout;
};

function imageSizes(variant: FeedNewsCardVariant): string {
  switch (variant) {
    case "lead":
      return IMG_CARD_LEAD;
    case "compact":
      return IMG_CARD_COMPACT;
    default:
      return IMG_CARD_FEED;
  }
}

function imageCrop(variant: FeedNewsCardVariant): "16:9" | "4:3" {
  return variant === "lead" ? "16:9" : "4:3";
}

export function FeedNewsCard({
  articleId,
  slug,
  headline,
  summary,
  imageUrl,
  categoryLabel,
  publishedAt,
  publishedLabel,
  readingTime,
  language,
  section,
  imageCategory,
  variant: variantProp = "standard",
  priority = false,
  rank,
  showSummary: showSummaryProp,
  langHint = "auto",
  surface = "homepage",
  listPosition,
  isLive = false,
  isBreaking = false,
  badge,
  index = 0,
  aiConfidence,
  href,
  sourceLabel,
  rhythm,
}: FeedNewsCardProps) {
  const { t } = useLanguage();
  const { time } = useLocaleFormat();
  const reduceMotion = useReducedMotion();
  const variant = rhythm
    ? feedVariantForRhythm(rhythm, variantProp)
    : variantProp;
  const showSummary =
    showSummaryProp ?? (variant !== "compact" && rhythm !== "compact");
  const hasImage = Boolean(imageUrl);
  const timeLabel =
    publishedLabel ??
    (publishedAt ? time(publishedAt) : null);
  const storyHref = href ?? `/story/${slug}`;

  const showSummaryResolved =
    rhythm === "emphasis"
      ? Boolean(summary)
      : showSummary;
  const showAiChip =
    Boolean(summary?.trim()) && typeof aiConfidence === "number" && aiConfidence > 0;

  return (
    <article
      className={`feed-news-card feed-news-card--${variant}${rhythm === "emphasis" ? " feed-news-card--emphasis" : ""}${!reduceMotion ? " feed-news-card--enter" : ""}`}
      style={{ "--ncard-i": index, "--motion-i": index } as CSSProperties}
    >
      <div className="feed-news-card__main">
        <TrackedStoryLink
          href={storyHref}
          slug={slug}
          category={section}
          region={section}
          surface={surface}
          listPosition={listPosition ?? rank}
          className="feed-news-card__link tap-target"
          prefetch={priority ? undefined : false}
        >
          {hasImage ? (
            <div className="feed-news-card__media">
              <MediaImage
                src={imageUrl}
                alt=""
                sizes={imageSizes(variant)}
                category={imageCategory ?? section}
                aspect="fill"
                cropAspect={imageCrop(variant)}
                priority={priority}
                fillParent
                hoverZoom
                cinematic={false}
                subtleScrim
                imageClassName="feed-news-card__img"
              />
              {badge ? (
                <span className="feed-news-card__badge">{badge}</span>
              ) : null}
              {isLive ? (
                <span className="feed-news-card__live" role="status">
                  <span className="feed-news-card__live-dot" aria-hidden />
                  {t.common.live}
                </span>
              ) : isBreaking ? (
                <span className="feed-news-card__breaking">
                  {t.common.breakingLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="feed-news-card__content">
            {typeof rank === "number" ? (
              <span className="feed-news-card__rank" aria-hidden>
                {rank}
              </span>
            ) : null}

            <h3
              className="feed-news-card__headline hi"
              lang={language === "hi" ? "hi" : undefined}
            >
              {headline}
            </h3>

            {showSummaryResolved && summary ? (
              <div className="feed-news-card__summary-row">
                {showAiChip ? (
                  <span
                    className="hp-ai-chip"
                    title={t.article.transparencyTitle}
                  >
                    {t.shorts.narrationShort}
                  </span>
                ) : null}
                <p className="feed-news-card__summary">{summary}</p>
              </div>
            ) : null}

            <div className="feed-news-card__meta">
              {timeLabel ? (
                <time dateTime={publishedAt}>{timeLabel}</time>
              ) : null}
              {categoryLabel ? (
                <>
                  <span className="feed-news-card__meta-sep" aria-hidden>
                    ·
                  </span>
                  <span className="feed-news-card__meta-category">
                    {categoryLabel}
                  </span>
                </>
              ) : null}
              {readingTime ? (
                <>
                  <span className="feed-news-card__meta-sep" aria-hidden>
                    ·
                  </span>
                  <span>{readingTime}</span>
                </>
              ) : null}
              {sourceLabel ? (
                <>
                  <span className="feed-news-card__meta-sep" aria-hidden>
                    ·
                  </span>
                  <span className="feed-news-card__meta-source">
                    {sourceLabel}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </TrackedStoryLink>

        <HeroCardActions
          articleId={articleId}
          headline={headline}
          summary={summary}
          slugOrPath={href ?? slug}
          commentHref={storyHref}
          langHint={langHint}
          className="feed-news-card__actions"
        />
      </div>
    </article>
  );
}
