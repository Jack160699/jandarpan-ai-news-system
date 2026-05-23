import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { computeFeedVersion } from "@/lib/realtime/feed-version";
import type { LiveHomepageSnapshot } from "@/lib/realtime/types";

/** Client-safe snapshot from full homepage feed */
export function snapshotFromFeed(
  feed: GeneratedHomepageFeed
): LiveHomepageSnapshot {
  return {
    version: computeFeedVersion({
      breakingTicker: feed.breakingTicker,
      liveWire: feed.liveWire,
      trending: feed.trending,
    }),
    fetchedAt: feed.fetchedAt,
    breakingTicker: feed.breakingTicker,
    liveWire: feed.liveWire,
    trending: feed.trending.slice(0, 16),
    localBreakingAlerts: feed.localBreakingAlerts,
  };
}
