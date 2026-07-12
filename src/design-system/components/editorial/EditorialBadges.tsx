import * as React from "react";
import { cn } from "@/design-system/utils/cn";
import { Badge } from "../Badge";

export type EditorialBadgesVariant = "default" | "feed";

export interface EditorialBadgesProps extends React.HTMLAttributes<HTMLDivElement> {
  category?: string;
  categoryVariant?: React.ComponentProps<typeof Badge>["variant"];
  isLive?: boolean;
  isBreaking?: boolean;
  liveLabel?: string;
  breakingLabel?: string;
  badge?: string;
  rank?: number;
  showAiChip?: boolean;
  aiChipLabel?: string;
  aiChipTitle?: string;
  variant?: EditorialBadgesVariant;
}

/** Shared overlay badges for editorial card media surfaces. */
export function EditorialBadges({
  className,
  category,
  categoryVariant = "default",
  isLive = false,
  isBreaking = false,
  liveLabel = "LIVE",
  breakingLabel = "Breaking",
  badge,
  rank,
  showAiChip = false,
  aiChipLabel,
  aiChipTitle,
  variant = "default",
  ...props
}: EditorialBadgesProps) {
  const isFeed = variant === "feed";
  const hasMediaOverlay = Boolean(badge) || isLive || isBreaking;
  const hasContentBadges =
    Boolean(category) || typeof rank === "number" || showAiChip;

  if (!hasMediaOverlay && !hasContentBadges) return null;

  if (isFeed && hasMediaOverlay) {
    return (
      <>
        {badge ? (
          <span className="feed-news-card__badge">{badge}</span>
        ) : null}
        {isLive ? (
          <span className="feed-news-card__live" role="status">
            <span className="feed-news-card__live-dot" aria-hidden />
            {liveLabel}
          </span>
        ) : isBreaking ? (
          <span className="feed-news-card__breaking">{breakingLabel}</span>
        ) : null}
      </>
    );
  }

  return (
    <>
      {hasMediaOverlay ? (
        <div
          className={cn("jds-editorial-badges jds-editorial-badges--media", className)}
          {...props}
        >
          {badge ? (
            <span className="jds-editorial-badges__custom">{badge}</span>
          ) : null}
          {isLive ? (
            <span className="jds-editorial-badges__live" role="status">
              <span className="jds-editorial-badges__live-dot" aria-hidden />
              {liveLabel}
            </span>
          ) : isBreaking ? (
            <span className="jds-editorial-badges__breaking">{breakingLabel}</span>
          ) : null}
        </div>
      ) : null}

      {hasContentBadges ? (
        <div className="jds-editorial-badges jds-editorial-badges--content">
          {typeof rank === "number" ? (
            <span className="jds-editorial-badges__rank" aria-hidden>
              {rank}
            </span>
          ) : null}
          {category ? <Badge variant={categoryVariant}>{category}</Badge> : null}
          {showAiChip && aiChipLabel ? (
            <span className="jds-editorial-badges__ai" title={aiChipTitle}>
              {aiChipLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

EditorialBadges.displayName = "EditorialBadges";
