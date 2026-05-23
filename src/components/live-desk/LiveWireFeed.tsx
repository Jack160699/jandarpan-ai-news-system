"use client";

import { memo } from "react";
import { BreakingWireItem } from "@/components/live-desk/BreakingWireItem";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveWireFeedProps = {
  items: HomeArticle[];
  variant?: "feed" | "rail";
  /** Max items in rail mode (homepage) */
  limit?: number;
  className?: string;
};

export const LiveWireFeed = memo(function LiveWireFeed({
  items,
  variant = "feed",
  limit,
  className = "",
}: LiveWireFeedProps) {
  const slice = limit ? items.slice(0, limit) : items;

  if (!slice.length) return null;

  if (variant === "rail") {
    return (
      <div
        className={`bwire-rail ${className}`.trim()}
        role="list"
        aria-label="Live breaking updates"
      >
        <div className="bwire-rail__track">
          {slice.map((article, index) => (
            <div key={article.id} className="bwire-rail__slot" role="listitem">
              <BreakingWireItem
                article={article}
                listPosition={index + 1}
                index={index}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bwire-feed ${className}`.trim()}
      role="feed"
      aria-label="Live breaking updates"
    >
      {slice.map((article, index) => (
        <BreakingWireItem
          key={article.id}
          article={article}
          listPosition={index + 1}
          index={index}
        />
      ))}
    </div>
  );
});
