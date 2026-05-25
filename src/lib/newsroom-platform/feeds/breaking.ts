import type { BreakingTickerItem, FeedPage } from "../content/types";
import {
  buildMockBreakingTicker,
  filterActiveBreaking,
} from "../content/mock/breaking";
import { sortByPriority } from "../content/validate";
import { ISR } from "../config/isr";

export type BreakingFeedOptions = {
  limit?: number;
  useMock?: boolean;
};

/**
 * Breaking news engine — mock today; swap body for Supabase later.
 */
export async function fetchBreakingFeed(
  options: BreakingFeedOptions = {}
): Promise<FeedPage<BreakingTickerItem>> {
  const limit = options.limit ?? 12;
  const useMock = options.useMock ?? true;

  if (!useMock) {
    // Future: read from `breaking_news` table
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: limit,
      fetchedAt: new Date().toISOString(),
      source: "supabase",
    };
  }

  const active = filterActiveBreaking(buildMockBreakingTicker());
  const sorted = sortByPriority(active).slice(0, limit);

  return {
    items: sorted,
    total: sorted.length,
    page: 1,
    pageSize: limit,
    fetchedAt: new Date().toISOString(),
    source: "mock",
  };
}

export const breakingRevalidate = ISR.breaking;
