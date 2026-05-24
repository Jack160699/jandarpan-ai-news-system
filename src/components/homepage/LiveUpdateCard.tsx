"use client";

import { memo } from "react";
import { QuickUpdateCard } from "@/components/quick-update/QuickUpdateCard";
import { homeArticleToQuickUpdate } from "@/lib/homepage/quick-update";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveUpdateCardProps = {
  article: HomeArticle;
  variant?: "wire" | "breaking";
  rank?: number;
  listPosition?: number;
};

export const LiveUpdateCard = memo(function LiveUpdateCard({
  article,
  variant = "wire",
  listPosition,
  rank,
}: LiveUpdateCardProps) {
  if (variant === "wire") {
    return (
      <QuickUpdateCard
        {...homeArticleToQuickUpdate(article)}
        listPosition={listPosition ?? rank}
        variant="feed"
      />
    );
  }

  return (
    <QuickUpdateCard
      {...homeArticleToQuickUpdate(article)}
      listPosition={listPosition ?? rank}
      variant="feed"
    />
  );
});
