"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAnalyticsCollector } from "@/hooks/useAnalyticsCollector";
import type { AnalyticsSurface } from "@/lib/analytics/types";

type TrackedStoryLinkProps = ComponentProps<typeof Link> & {
  slug: string;
  category?: string;
  region?: string;
  surface?: AnalyticsSurface;
  listPosition?: number;
};

export function TrackedStoryLink({
  slug,
  category,
  region,
  surface = "homepage",
  listPosition,
  onClick,
  children,
  ...rest
}: TrackedStoryLinkProps) {
  const { track } = useAnalyticsCollector();

  return (
    <Link
      {...rest}
      onClick={(e) => {
        track({
          eventType: "article_click",
          articleSlug: slug,
          category,
          region,
          surface,
          metadata: listPosition != null ? { listPosition } : undefined,
        });
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
