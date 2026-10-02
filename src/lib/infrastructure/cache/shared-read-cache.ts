/**
 * Shared read cache for Supabase-backed list/aggregate reads.
 *
 * Why it exists: on the Free plan the whole project is cut off when egress passes the monthly allowance (HTTP 402
 * exceed_egress_quota). Measured over 14 days, the biggest consumers were public pages that re-read the same large lists on
 * every request: district/topic hub counts (~0.9 MB per call), the homepage/list pool, and the broadcast feed. Reading a list
 * once per TTL instead of once per request is the single largest egress lever.
 *
 * Behaviour: Next.js Data Cache (unstable_cache, shared across requests and instances, tag-revalidated on publish) with an
 * in-process TTL memo as a fallback when the Data Cache is unavailable (scripts, tests, workers). A loader that throws is
 * NEVER cached and its error is propagated unchanged. JD_DISABLE_READ_CACHE=true turns the cache off (emergency / debugging).
 * The Edge workers bundle src/lib/runtime/shared-read-cache.edge.ts instead (a pass-through): they must always read fresh.
 */

import { unstable_cache } from "next/cache";

type MemoEntry = { at: number; value: unknown };
const memo = new Map<string, MemoEntry>();

/** Test hook. */
export function clearSharedReadMemo(): void {
  memo.clear();
  inflight.clear();
}

export type CachedReadOptions = {
  ttlSeconds: number;
  /** Data Cache tags; revalidateTag(tag) on publish refreshes these immediately. */
  tags?: string[];
};

async function memoized<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlSeconds * 1000) return hit.value as T;
  const value = await loader();
  memo.set(key, { at: Date.now(), value });
  return value;
}

/**
 * Single-flight: concurrent callers of the same key in this process share ONE load. Without it a burst of requests arriving while the
 * entry is expired (the moment after a purge) each ran the loader -- N identical ~0.7 MB reads instead of one.
 */
const inflight = new Map<string, Promise<unknown>>();

export async function cachedRead<T>(keyParts: string[], options: CachedReadOptions, loader: () => Promise<T>): Promise<T> {
  if (options.ttlSeconds <= 0 || process.env.JD_DISABLE_READ_CACHE === "true") return loader();
  const flightKey = keyParts.join("|");
  const existing = inflight.get(flightKey);
  if (existing) return existing as Promise<T>;
  const flight = cachedReadOnce(keyParts, options, loader).finally(() => {
    if (inflight.get(flightKey) === flight) inflight.delete(flightKey);
  });
  inflight.set(flightKey, flight);
  return flight;
}

async function cachedReadOnce<T>(keyParts: string[], options: CachedReadOptions, loader: () => Promise<T>): Promise<T> {

  let loaderError: unknown;
  let failed = false;
  let loaded = false;
  let value: T | undefined;
  const wrapped = async (): Promise<T> => {
    try {
      value = await loader();
      loaded = true;
      return value;
    } catch (err) {
      failed = true;
      loaderError = err;
      throw err;
    }
  };

  try {
    return await unstable_cache(wrapped, keyParts, { revalidate: options.ttlSeconds, tags: options.tags })();
  } catch (err) {
    if (failed) throw loaderError; // the loader itself failed: surface it, never cache it
    if (loaded) return value as T; // loaded fine but the cache layer failed to store it
    // Data Cache unavailable in this runtime (no Next request context): fall back to a per-process memo.
    return memoized(keyParts.join("|"), options.ttlSeconds, loader);
  }
}
