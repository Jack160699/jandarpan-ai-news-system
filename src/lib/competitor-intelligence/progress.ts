/**
 * Persisted competitor crawl progress — continuation cursor across cron ticks.
 */

import {
  COMPETITOR_PROGRESS_CACHE_KEY,
  COMPETITOR_PROGRESS_TTL_SEC,
} from "@/lib/competitor-intelligence/config";
import { cacheGetJson, cacheSetJson, cacheDelete } from "@/lib/infrastructure/cache";

export type CompetitorCrawlProgress = {
  cursorSourceId: string | null;
  updatedAt: string;
  lastRunId: string | null;
  sourcesCompleted: number;
};

export async function loadCompetitorProgress(): Promise<CompetitorCrawlProgress | null> {
  return cacheGetJson<CompetitorCrawlProgress>(COMPETITOR_PROGRESS_CACHE_KEY);
}

export async function saveCompetitorProgress(
  progress: CompetitorCrawlProgress
): Promise<void> {
  await cacheSetJson(
    COMPETITOR_PROGRESS_CACHE_KEY,
    progress,
    COMPETITOR_PROGRESS_TTL_SEC
  );
}

export async function clearCompetitorProgress(): Promise<void> {
  await cacheDelete(COMPETITOR_PROGRESS_CACHE_KEY);
}

/** Rotate source list so the next batch starts after the cursor. */
export function rotateSourcesFromCursor<T extends { id: string }>(
  sources: T[],
  cursorSourceId: string | null
): T[] {
  if (!cursorSourceId || sources.length === 0) return sources;
  const idx = sources.findIndex((s) => s.id === cursorSourceId);
  if (idx < 0) return sources;
  const next = idx + 1;
  if (next >= sources.length) return sources;
  return [...sources.slice(next), ...sources.slice(0, next)];
}
