"use client";

import { memo } from "react";
import { QuickUpdateFeed } from "@/components/quick-update/QuickUpdateFeed";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveWireFeedProps = {
  items: HomeArticle[];
  variant?: "feed" | "rail";
  limit?: number;
  className?: string;
  freshIds?: ReadonlySet<string>;
};

export const LiveWireFeed = memo(function LiveWireFeed(props: LiveWireFeedProps) {
  return <QuickUpdateFeed {...props} />;
});
