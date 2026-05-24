"use client";

import { useMemo } from "react";
import { BreakingTicker } from "@/components/layout/BreakingTicker";
import { TrendingStrip } from "@/components/homepage/TrendingStrip";
import { HomepageStackPortal } from "@/components/layout/HomepageStackPortal";
import { buildTickerHeadlines } from "@/lib/homepage/ticker-headlines";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";

type HomepageStackBandsProps = {
  trendingTopics?: string[];
};

/** Homepage-only layers mounted into the unified sticky stack via portal */
export function HomepageStackBands({ trendingTopics }: HomepageStackBandsProps) {
  const { feed, freshIds } = useLiveNewsroom();
  const tickerItems = useMemo(() => buildTickerHeadlines(feed), [feed]);

  return (
    <HomepageStackPortal hasTicker>
      <div className="stack-band stack-band--trending">
        <TrendingStrip topics={trendingTopics} />
      </div>
      <div className="stack-band stack-band--ticker">
        <BreakingTicker items={tickerItems} freshIds={freshIds} />
      </div>
    </HomepageStackPortal>
  );
}
