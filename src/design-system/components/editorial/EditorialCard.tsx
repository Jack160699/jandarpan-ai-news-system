import * as React from "react";
import { JdsCardImage } from "../JdsCardImage/JdsCardImage";
import { cn } from "@/design-system/utils/cn";
import { focusRingClass } from "@/design-system/utils/aria";
import { ArticleMeta } from "../ArticleMeta";
import { EditorialBadges } from "./EditorialBadges";
import { editorialImageSizes } from "./image-sizes";
import type {
  EditorialCardBaseProps,
  EditorialCardLayout,
  EditorialCardVariant,
  EditorialHeadlineLevel,
} from "./types";

export interface EditorialCardProps
  extends EditorialCardBaseProps,
    Omit<React.HTMLAttributes<HTMLElement>, keyof EditorialCardBaseProps> {
  variant?: EditorialCardVariant;
  layout?: EditorialCardLayout;
  children?: React.ReactNode;
}

function headlineTag(
  level: EditorialHeadlineLevel,
  isHero: boolean
): EditorialHeadlineLevel {
  if (isHero) return "h2";
  return level;
}

/**
 * Canonical editorial card — single visual primitive for all story surfaces.
 * Feature modules compose this; legacy cards wrap it.
 */
export const EditorialCard = React.forwardRef<HTMLElement, EditorialCardProps>(
  (
    {
      className,
      variant = "standard",
      layout = "vertical",
      headline,
      excerpt,
      imageUrl,
      imageAlt,
      category,
      categoryVariant = variant === "hero" ? "breaking" : "default",
      author,
      publishedAt,
      publishedAtIso,
      updatedAt,
      readTime,
      district,
      source,
      confidence,
      href,
      priority = false,
      rank,
      isLive = false,
      isBreaking = false,
      liveLabel,
      breakingLabel,
      badge,
      showAiChip = false,
      aiChipLabel,
      aiChipTitle,
      lang,
      headlineLevel = "h3",
      imageSizes,
      imageCategory,
      children,
      ...props
    },
    ref
  ) => {
    const isHero = variant === "hero";
    const isSummary = variant === "summary";
    const isCompact = variant === "compact" || isSummary;
    const resolvedLayout: EditorialCardLayout =
      isCompact || layout === "horizontal" ? "horizontal" : layout;
    const Tag = href ? "a" : "article";
    const linkProps = href ? { href } : {};
    const resolvedAlt = imageAlt ?? headline;
    const sizes = imageSizes ?? editorialImageSizes(variant);
    const HeadlineTag = headlineTag(headlineLevel, isHero);
    const cropAspect = isHero || variant === "featured" ? "16:9" : "4:3";

    const rootClass = isHero
      ? cn("jds-hero-card", "jds-interactive", focusRingClass, className)
      : cn(
          "jds-news-card",
          "jds-news-card--interactive",
          "jds-interactive",
          focusRingClass,
          resolvedLayout === "horizontal" && "jds-news-card--horizontal",
          isCompact && "jds-news-card--compact",
          variant === "featured" && "jds-news-card--featured",
          isSummary && "jds-news-card--summary",
          className
        );

    const showCategoryInContent = !isHero && Boolean(category) && !badge;

    return (
      <Tag
        ref={ref as React.Ref<HTMLAnchorElement & HTMLElement>}
        className={rootClass}
        lang={lang}
        {...linkProps}
        {...props}
      >
        {imageUrl && !isSummary ? (
          <div
            className={isHero ? "jds-hero-card__media" : "jds-news-card__media"}
            aria-hidden={Boolean(href)}
          >
            <JdsCardImage
              className={isHero ? "jds-hero-card__image" : "jds-news-card__image"}
              src={imageUrl}
              alt={resolvedAlt}
              priority={priority || isHero}
              sizes={sizes}
              category={imageCategory ?? category}
              cropAspect={cropAspect}
            />
            <EditorialBadges
              badge={badge}
              isLive={isLive}
              isBreaking={isBreaking}
              liveLabel={liveLabel}
              breakingLabel={breakingLabel}
            />
          </div>
        ) : null}

        {isHero ? <div className="jds-hero-card__scrim" aria-hidden /> : null}

        <div className={isHero ? "jds-hero-card__content" : "jds-news-card__content"}>
          <EditorialBadges
            category={showCategoryInContent ? category : undefined}
            categoryVariant={categoryVariant}
            rank={rank}
            showAiChip={showAiChip}
            aiChipLabel={aiChipLabel}
            aiChipTitle={aiChipTitle}
          />

          <HeadlineTag
            className={isHero ? "jds-hero-card__headline" : "jds-news-card__headline"}
          >
            {headline}
          </HeadlineTag>

          {excerpt ? (
            <p className={isHero ? "jds-hero-card__summary" : "jds-news-card__summary"}>
              {excerpt}
            </p>
          ) : null}

          <ArticleMeta
            author={author}
            publishedAt={publishedAt}
            publishedAtIso={publishedAtIso}
            updatedAt={updatedAt}
            readTime={readTime}
            district={district}
            source={source}
            confidence={confidence}
            category={isHero ? category : undefined}
          />

          {children}
        </div>
      </Tag>
    );
  }
);
EditorialCard.displayName = "EditorialCard";
