"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LiveDeskHeader } from "@/components/live-desk/LiveDeskHeader";
import { LiveDeskRefresh } from "@/components/live-desk/LiveDeskRefresh";
import { LiveWireFeed } from "@/components/live-desk/LiveWireFeed";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveDeskViewProps = {
  items: HomeArticle[];
  tickerItems?: HomeArticle[];
};

function mergeLiveItems(
  primary: HomeArticle[],
  extra: HomeArticle[] = []
): HomeArticle[] {
  const seen = new Set<string>();
  const out: HomeArticle[] = [];

  for (const item of [...primary, ...extra]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }

  return out.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function LiveDeskView({ items, tickerItems = [] }: LiveDeskViewProps) {
  const feed = useMemo(
    () => mergeLiveItems(items, tickerItems),
    [items, tickerItems]
  );

  const liveCount = feed.filter((i) => i.isLive || i.ranking.isBreaking).length;

  return (
    <>
      <LiveDeskRefresh />

      <div className="live-desk">
        <div className="nr-wrap live-desk__top">
          <LiveDeskHeader updateCount={feed.length} />
          <p className="live-desk__hint">
            Auto-updates every minute · swipe on mobile
          </p>
        </div>

        {feed.length > 0 ? (
          <div className="live-desk__feed-wrap nr-wrap">
            <div className="live-desk__feed-head">
              <span className="live-desk__feed-label">
                {liveCount > 0 ? `${liveCount} developing` : "Latest"}
              </span>
              <span className="live-desk__feed-sync" aria-hidden>
                <span className="live-desk__sync-dot" />
                Syncing
              </span>
            </div>
            <LiveWireFeed items={feed} variant="feed" />
          </div>
        ) : (
          <div className="nr-wrap live-desk__empty">
            <p>No live updates right now.</p>
            <Link href="/" className="live-desk__empty-link tap-target">
              Back to homepage
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
