"use client";

import { useMemo } from "react";
import { PageStickyBand } from "@/components/navigation/PageStickyBand";
import { LiveNewsroomStatus } from "@/components/live-newsroom/LiveNewsroomStatus";
import { LiveDeskHeader } from "@/components/live-desk/LiveDeskHeader";
import { LiveWireFeed } from "@/components/live-desk/LiveWireFeed";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { LiveNewsroomProvider, useLiveNewsroom } from "@/providers/LiveNewsroomProvider";
import Link from "next/link";

type LiveDeskLiveViewProps = {
  feed: GeneratedHomepageFeed;
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

export function LiveDeskLiveView({ feed }: LiveDeskLiveViewProps) {
  return (
    <LiveNewsroomProvider initialFeed={feed}>
      <LiveDeskLiveContent />
    </LiveNewsroomProvider>
  );
}

function LiveDeskLiveContent() {
  const { feed, freshIds } = useLiveNewsroom();

  const wire = useMemo(
    () => mergeLiveItems(feed.liveWire, feed.breakingTicker),
    [feed.liveWire, feed.breakingTicker]
  );

  const liveCount = wire.filter((i) => i.isLive || i.ranking.isBreaking).length;

  return (
    <div className="live-desk nr--has-page-stickies nr--has-live-strip">
      <div className="nr-wrap live-desk__top">
        <LiveDeskHeader updateCount={wire.length} />
        <PageStickyBand>
          <LiveNewsroomStatus />
        </PageStickyBand>
        <p className="live-desk__hint">
          Auto-updates every 1–2 min · scroll to browse
        </p>
      </div>

      {wire.length > 0 ? (
        <div className="live-desk__feed-wrap nr-wrap">
          <div className="live-desk__feed-head">
            <span className="live-desk__feed-label">
              {liveCount > 0 ? `${liveCount} developing` : "Latest"}
            </span>
            <span className="live-desk__feed-sync" aria-hidden>
              <span className="live-desk__sync-dot" />
              Live
            </span>
          </div>
          <LiveWireFeed items={wire} variant="feed" freshIds={freshIds} />
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
  );
}
