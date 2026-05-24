"use client";

import { BreakingTicker } from "@/components/layout/BreakingTicker";
import { TrendingStrip } from "@/components/homepage/TrendingStrip";
import { LiveNewsroomStatus } from "@/components/live-newsroom/LiveNewsroomStatus";
import { HomepageStackPortal } from "@/components/layout/HomepageStackPortal";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";

type HomepageStackBandsProps = {
  trendingTopics?: string[];
};

/** Homepage-only layers mounted into the unified sticky stack via portal */
export function HomepageStackBands({ trendingTopics }: HomepageStackBandsProps) {
  const { feed } = useLiveNewsroom();
  const hasTicker = feed.breakingTicker.length > 0;

  return (
    <HomepageStackPortal hasTicker={hasTicker}>
      <div className="stack-band stack-band--trending">
        <TrendingStrip topics={trendingTopics} />
      </div>
      <div className="stack-band stack-band--live">
        <LiveNewsroomStatus />
      </div>
      {hasTicker ? (
        <div className="stack-band stack-band--ticker">
          <BreakingTicker items={feed.breakingTicker} />
        </div>
      ) : null}
    </HomepageStackPortal>
  );
}
