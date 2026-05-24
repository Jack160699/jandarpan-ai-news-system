"use client";

import { memo } from "react";
import { QuickUpdateCard } from "@/components/quick-update/QuickUpdateCard";
import { homeArticleToQuickUpdate } from "@/lib/homepage/quick-update";
import type { HomeArticle } from "@/lib/homepage/types";

type BreakingWireItemProps = {
  article: HomeArticle;
  listPosition?: number;
  index?: number;
  isFreshMarker?: boolean;
  isIncoming?: boolean;
};

/** @deprecated Prefer QuickUpdateCard — kept for import stability */
export const BreakingWireItem = memo(function BreakingWireItem({
  article,
  listPosition,
  index = 0,
  isIncoming = false,
}: BreakingWireItemProps) {
  return (
    <QuickUpdateCard
      {...homeArticleToQuickUpdate(article)}
      listPosition={listPosition}
      index={index}
      variant="feed"
      isIncoming={isIncoming}
    />
  );
});
