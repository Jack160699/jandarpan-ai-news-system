"use client";

import { type CSSProperties } from "react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { HeroCardActions } from "@/components/layout/HeroCardActions";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { EditorialBadges } from "@/design-system/components/editorial/EditorialBadges";
import { ArticleMeta } from "@/design-system/components/ArticleMeta";
import {
  IMG_CARD_COMPACT,
  IMG_CARD_FEED,
  IMG_CARD_LEAD,
} from "@/design-system/components/editorial/image-sizes";
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

/**
 * @deprecated Legacy feed card shell — renders design-system image, meta, and badge primitives.
 * Migrate callers to EditorialCard / CompactCard from @/design-system.
 */
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
              <JdsCardImage
                src={imageUrl}
                alt={headline}
                sizes={imageSizes(variant)}
                category={imageCategory ?? section}
                cropAspect={imageCrop(variant)}
                priority={priority}
                className="feed-news-card__img"
              />
              <EditorialBadges
                variant="feed"
                badge={badge}
                isLive={isLive}
                isBreaking={isBreaking}
                liveLabel={t.common.live}
                breakingLabel={t.common.breakingLabel}
              />
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

            <ArticleMeta
              variant="feed"
              publishedAt={timeLabel ?? undefined}
              publishedAtIso={publishedAt}
              category={categoryLabel}
              readTime={readingTime}
              source={sourceLabel}
            />
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
