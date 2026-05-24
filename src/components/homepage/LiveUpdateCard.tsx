"use client";

import { memo } from "react";
import { QuickUpdateCard } from "@/components/quick-update/QuickUpdateCard";
import { homeArticleToQuickUpdate } from "@/lib/homepage/quick-update";
import type { HomeArticle } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

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
  const { language } = useLanguage();
  const quick = homeArticleToQuickUpdate(article, language);

  if (variant === "wire") {
    return (
      <QuickUpdateCard
        {...quick}
        listPosition={listPosition ?? rank}
        variant="feed"
      />
    );
  }

  return (
    <QuickUpdateCard
      {...quick}
      listPosition={listPosition ?? rank}
      variant="feed"
    />
  );
});
