"use client";

import { memo } from "react";
import Link from "next/link";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/design-system/utils/cn";

export type FeedLiveCardProps = {
  headline: string;
  publishedAt?: string;
  updateCount: number;
  href: string;
  liveLabel: string;
  updatesLabel: string;
};

export const FeedLiveCard = memo(function FeedLiveCard({
  headline,
  publishedAt,
  updateCount,
  href,
  liveLabel,
  updatesLabel,
}: FeedLiveCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "atlas-feed-live",
        "tap-target",
        "jds-interactive",
        focusRingClass
      )}
      aria-label={`${liveLabel}: ${headline}`}
    >
      <div className="atlas-feed-live__head">
        <span className="atlas-feed-live__pill" aria-hidden>
          {liveLabel}
        </span>
        <span className="atlas-feed-live__count">
          {updateCount} {updatesLabel}
        </span>
        {publishedAt ? (
          <time className="atlas-feed-live__time">{publishedAt}</time>
        ) : null}
      </div>
      <h3 className="atlas-feed-live__headline">{headline}</h3>
    </Link>
  );
});
