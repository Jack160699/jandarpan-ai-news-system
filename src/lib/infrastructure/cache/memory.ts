/**
 * In-process TTL cache — fallback when Redis unavailable
 */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<string>>();

export function memoryCacheGet(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function memoryCacheSet(
  key: string,
  value: string,
  ttlSeconds: number
): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function memoryCacheDelete(key: string): void {
  store.delete(key);
}
