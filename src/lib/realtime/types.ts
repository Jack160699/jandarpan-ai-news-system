import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";

/** Lightweight payload for live polling — no full homepage rebuild on client */
export type LiveHomepageSnapshot = {
  version: string;
  fetchedAt: string;
  breakingTicker: HomeArticle[];
  liveWire: HomeArticle[];
  trending: HomeArticle[];
  localBreakingAlerts: GeneratedHomepageFeed["localBreakingAlerts"];
};

export type LivePollResult = {
  ok: true;
  snapshot: LiveHomepageSnapshot;
} | {
  ok: false;
  error: string;
};
