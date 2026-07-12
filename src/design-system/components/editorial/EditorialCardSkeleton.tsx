import * as React from "react";
import { cn } from "@/design-system/utils/cn";
import { Skeleton } from "../Skeleton";
import type { EditorialCardVariant } from "./types";

export interface EditorialCardSkeletonProps
  extends React.HTMLAttributes<HTMLElement> {
  variant?: EditorialCardVariant;
  layout?: "vertical" | "horizontal";
  showActions?: boolean;
}

/** Canonical loading skeleton for editorial cards — one shimmer strategy. */
export function EditorialCardSkeleton({
  className,
  variant = "standard",
  layout = "vertical",
  showActions = false,
  ...props
}: EditorialCardSkeletonProps) {
  const isHero = variant === "hero";
  const isCompact = variant === "compact" || variant === "summary";
  const isHorizontal = layout === "horizontal" && !isHero;

  return (
    <article
      className={cn(
        "jds-editorial-skeleton",
        isHero && "jds-editorial-skeleton--hero",
        isCompact && "jds-editorial-skeleton--compact",
        isHorizontal && "jds-editorial-skeleton--horizontal",
        className
      )}
      aria-hidden
      aria-busy="true"
      {...props}
    >
      <div className="jds-editorial-skeleton__main">
        <Skeleton variant="media" className="jds-editorial-skeleton__media" />
        <div className="jds-editorial-skeleton__content">
          <Skeleton variant="title" />
          {!isCompact ? <Skeleton variant="title" className="jds-editorial-skeleton__title-short" /> : null}
          {!isCompact ? <Skeleton variant="text" className="jds-editorial-skeleton__summary" /> : null}
          <Skeleton variant="text" className="jds-editorial-skeleton__meta" />
        </div>
      </div>
      {showActions ? (
        <div className="jds-editorial-skeleton__actions" aria-hidden>
          <Skeleton variant="avatar" className="jds-editorial-skeleton__action" />
          <Skeleton variant="avatar" className="jds-editorial-skeleton__action" />
          <Skeleton variant="avatar" className="jds-editorial-skeleton__action" />
          <Skeleton variant="avatar" className="jds-editorial-skeleton__action" />
        </div>
      ) : null}
    </article>
  );
}

EditorialCardSkeleton.displayName = "EditorialCardSkeleton";
