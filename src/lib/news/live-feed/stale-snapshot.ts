/**
 * Stale-while-revalidate — persist last successful feed pool.
 */

import { AGGREGATION_CONFIG } from "@/lib/news/aggregation/config";
import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { NEWS_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
import { memoryCacheGet, memoryCacheSet } from "@/lib/infrastructure/cache/memory";
import { logLiveFeed } from "@/lib/news/live-feed/logger";
import type { LivePoolSource } from "@/lib/news/live-feed/resolve-pool";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export type FeedSnapshot = {
  rows: GeneratedArticleRow[];
  savedAt: string;
  source: LivePoolSource;
  poolSize: number;
};

const MEMORY_KEY = "__nr_stale_snapshot__";

function snapshotAgeMs(savedAt: string): number {
  return Date.now() - new Date(savedAt).getTime();
}

export function isSnapshotFresh(
  snapshot: FeedSnapshot,
  maxAgeMs = AGGREGATION_CONFIG.staleSnapshotMaxAgeMs
): boolean {
  return snapshotAgeMs(snapshot.savedAt) <= maxAgeMs;
}

export async function saveFeedSnapshot(
  rows: GeneratedArticleRow[],
  source: LivePoolSource
): Promise<void> {
  if (!rows.length) return;

  const payload: FeedSnapshot = {
    rows: rows.slice(0, 120),
    savedAt: new Date().toISOString(),
    source,
    poolSize: rows.length,
  };

  const raw = JSON.stringify(payload);
  memoryCacheSet(MEMORY_KEY, raw, AGGREGATION_CONFIG.staleSnapshotTtlSec);
  await cacheSetJson(
    NEWS_CACHE_KEYS.staleSnapshot,
    payload,
    AGGREGATION_CONFIG.staleSnapshotTtlSec
  );

  logLiveFeed("snapshot_saved", {
    source,
    poolSize: payload.poolSize,
    savedAt: payload.savedAt,
  });
}

export async function loadStaleSnapshot(): Promise<FeedSnapshot | null> {
  const fromRedis = await cacheGetJson<FeedSnapshot>(NEWS_CACHE_KEYS.staleSnapshot);
  if (fromRedis && isSnapshotFresh(fromRedis)) return fromRedis;

  const raw = memoryCacheGet(MEMORY_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as FeedSnapshot;
    if (!parsed.rows?.length || !isSnapshotFresh(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadStaleSnapshotWithMeta(): Promise<{
  snapshot: FeedSnapshot;
  ageMs: number;
} | null> {
  const snap = await loadStaleSnapshot();
  if (!snap) return null;
  return { snapshot: snap, ageMs: snapshotAgeMs(snap.savedAt) };
}
