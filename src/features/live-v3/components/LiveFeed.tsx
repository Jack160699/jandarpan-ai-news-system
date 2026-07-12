"use client";

import { QuickUpdateFeed } from "@/components/quick-update/QuickUpdateFeed";
import type { HomeArticle } from "@/lib/homepage/types";

export type LiveFeedProps = {
  items: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export function LiveFeed({ items, freshIds }: LiveFeedProps) {
  if (items.length === 0) return null;

  return (
    <div className="lv3-feed" aria-label="Live wire feed">
      <QuickUpdateFeed
        items={items}
        variant="feed"
        freshIds={freshIds}
        className="lv3-feed__list"
      />
    </div>
  );
}
