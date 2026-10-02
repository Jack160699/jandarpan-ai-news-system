/**
 * Redis copy of the editorial worker's "recent stories" index (headlines, body fingerprints, event ids, hero images).
 *
 * The worker re-read this from Supabase on every 5-minute wake (~75 KB at 150 rows) although it only changes when a story is
 * persisted. Redis (Upstash) is not Supabase egress, so the index is cached there for STORY_INDEX_CACHE_TTL_SECONDS and DELETED the
 * moment the worker persists a story, so the next wake reloads it once. Staleness is bounded by the TTL for stories persisted by
 * other paths (admin publish), and the authoritative same-story check on the final drafted text does not use this index.
 *
 * Failure policy: a missing/unreachable/corrupt cache is a MISS (the caller reads Supabase as before) -- it never changes what the
 * worker decides, only where the data comes from. Writes use EVAL (the value travels in the POST body, not in a URL).
 */

import { isRedisConfigured, redisDel, redisEval, redisGet } from "@/lib/infrastructure/cache/redis";

export const STORY_INDEX_CACHE_KEY = "jd:story-index:v1";
export const STORY_INDEX_CACHE_TTL_SECONDS = 600;

export type StoryIndexCacheRow = {
  id: string | null;
  headline: string | null;
  event_id: string | null;
  hero_image_url: string | null;
  workflow_status: string | null;
  published_at: string | null;
  fingerprint: string | null;
};

type Packed = { v: 1; limit: number; at: number; r: Array<Array<string | null>> };

const SET_SCRIPT = "redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2])); return 1";

export function packStoryIndex(rows: StoryIndexCacheRow[], limit: number, now: number = Date.now()): string {
  const packed: Packed = {
    v: 1,
    limit,
    at: now,
    r: rows.map((x) => [x.id, x.headline, x.event_id, x.hero_image_url, x.workflow_status, x.published_at, x.fingerprint]),
  };
  return JSON.stringify(packed);
}

/** Returns null for anything that is not a well-formed, same-limit, unexpired copy. */
export function unpackStoryIndex(raw: string | null, limit: number, now: number = Date.now()): StoryIndexCacheRow[] | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Packed;
    if (p?.v !== 1 || p.limit !== limit || !Array.isArray(p.r)) return null;
    if (now - p.at > STORY_INDEX_CACHE_TTL_SECONDS * 1000) return null;
    return p.r.map((a) => ({
      id: a[0] ?? null,
      headline: a[1] ?? null,
      event_id: a[2] ?? null,
      hero_image_url: a[3] ?? null,
      workflow_status: a[4] ?? null,
      published_at: a[5] ?? null,
      fingerprint: a[6] ?? null,
    }));
  } catch {
    return null;
  }
}

export async function readStoryIndexCache(limit: number): Promise<StoryIndexCacheRow[] | null> {
  if (!isRedisConfigured()) return null;
  return unpackStoryIndex(await redisGet(STORY_INDEX_CACHE_KEY), limit);
}

export async function writeStoryIndexCache(rows: StoryIndexCacheRow[], limit: number): Promise<void> {
  if (!isRedisConfigured() || rows.length === 0) return;
  await redisEval(SET_SCRIPT, [STORY_INDEX_CACHE_KEY], [packStoryIndex(rows, limit), STORY_INDEX_CACHE_TTL_SECONDS]).catch(() => null);
}

export async function invalidateStoryIndexCache(): Promise<void> {
  if (!isRedisConfigured()) return;
  await redisDel(STORY_INDEX_CACHE_KEY).catch(() => undefined);
}
