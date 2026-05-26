/**
 * Request deduplication — prevents duplicate expensive operations
 */

import { cacheGet, cacheSet } from "@/lib/infrastructure/cache";

const memoryInflight = new Map<string, Promise<unknown>>();

export async function withDedup<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet(`dedup:result:${key}`);
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      /* continue */
    }
  }

  const inflight = memoryInflight.get(key) as Promise<T> | undefined;
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const result = await fn();
      await cacheSet(`dedup:result:${key}`, JSON.stringify(result), ttlSeconds);
      return result;
    } finally {
      memoryInflight.delete(key);
    }
  })();

  memoryInflight.set(key, promise);
  return promise;
}

export async function isDuplicateRequest(
  fingerprint: string,
  windowSec: number
): Promise<boolean> {
  const lockKey = `dedup:lock:${fingerprint}`;
  const existing = await cacheGet(lockKey);
  if (existing) return true;
  await cacheSet(lockKey, "1", windowSec);
  return false;
}
