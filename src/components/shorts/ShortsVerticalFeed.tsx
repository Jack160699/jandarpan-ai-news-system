"use client";

import { useState } from "react";
import { NewsShortCard } from "@/components/shorts/NewsShortCard";
import type { NewsShortCard as ShortCardType } from "@/lib/news/shorts/types";

type ShortsVerticalFeedProps = {
  shorts: ShortCardType[];
};

export function ShortsVerticalFeed({ shorts }: ShortsVerticalFeedProps) {
  const [activeId, setActiveId] = useState(shorts[0]?.articleId ?? "");

  if (!shorts.length) {
    return (
      <p className="shorts-empty">No news shorts yet. Run ingest and short generation.</p>
    );
  }

  return (
    <div className="shorts-feed" role="feed" aria-label="News shorts">
      {shorts.map((short) => (
        <div key={short.articleId} className="shorts-feed__item">
          <NewsShortCard
            short={short}
            active={activeId === short.articleId}
            onActivate={() => setActiveId(short.articleId)}
          />
        </div>
      ))}
    </div>
  );
}
