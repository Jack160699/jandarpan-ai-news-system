"use client";

import { memo } from "react";
import { QuickUpdateCard } from "@/components/quick-update/QuickUpdateCard";
import { homeArticleToQuickUpdate } from "@/lib/homepage/quick-update";
import type { HomeArticle } from "@/lib/homepage/types";

type QuickUpdateFeedProps = {
  items: HomeArticle[];
  variant?: "feed" | "rail";
  limit?: number;
  className?: string;
  freshIds?: ReadonlySet<string>;
};

export const QuickUpdateFeed = memo(function QuickUpdateFeed({
  items,
  variant = "feed",
  limit,
  className = "",
  freshIds,
}: QuickUpdateFeedProps) {
  const slice = limit ? items.slice(0, limit) : items;
  if (!slice.length) return null;

  if (variant === "rail") {
    return (
      <div
        className={`quick-update-rail ${className}`.trim()}
        role="list"
        aria-label="Live quick updates"
      >
        <div className="quick-update-rail__track">
          {slice.map((article, index) => (
            <div
              key={article.id}
              className="quick-update-rail__slot"
              role="listitem"
            >
              <QuickUpdateCard
                {...homeArticleToQuickUpdate(article)}
                listPosition={index + 1}
                index={index}
                variant="rail"
                isIncoming={freshIds?.has(article.id)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`quick-update-feed ${className}`.trim()}
      role="feed"
      aria-label="Live quick updates"
    >
      {slice.map((article, index) => (
        <QuickUpdateCard
          key={article.id}
          {...homeArticleToQuickUpdate(article)}
          listPosition={index + 1}
          index={index}
          variant="feed"
          isIncoming={freshIds?.has(article.id)}
        />
      ))}
    </div>
  );
});
