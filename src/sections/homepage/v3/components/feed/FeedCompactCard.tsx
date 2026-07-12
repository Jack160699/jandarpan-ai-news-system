"use client";

import { memo } from "react";
import Link from "next/link";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/design-system/utils/cn";

export type FeedCompactCardProps = {
  headline: string;
  category?: string;
  publishedAt?: string;
  href: string;
  showDivider?: boolean;
};

export const FeedCompactCard = memo(function FeedCompactCard({
  headline,
  category,
  publishedAt,
  href,
  showDivider = true,
}: FeedCompactCardProps) {
  return (
    <>
      {showDivider ? <hr className="atlas-feed__divider" aria-hidden /> : null}
      <Link
        href={href}
        className={cn(
          "atlas-feed-compact",
          "tap-target",
          "jds-interactive",
          focusRingClass
        )}
        aria-label={headline}
      >
        {category ? (
          <span className="atlas-feed-compact__badge">{category}</span>
        ) : null}
        <h3 className="atlas-feed-compact__headline">{headline}</h3>
        {publishedAt ? (
          <time className="atlas-feed-compact__time">{publishedAt}</time>
        ) : null}
      </Link>
    </>
  );
});
