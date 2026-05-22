/**
 * In-memory TTL cache for image extraction (per serverless invocation)
 */

type CacheEntry<T> = { value: T; expiresAt: number };

const HTML_TTL_MS = 30 * 60 * 1000;
const IMAGE_TTL_MS = 60 * 60 * 1000;

const htmlCache = new Map<string, CacheEntry<string>>();
const imageCache = new Map<string, CacheEntry<string | null>>();

function get<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return undefined;
  }
  return entry.value;
}

function set<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  if (map.size > 500) {
    const first = map.keys().next().value;
    if (first) map.delete(first);
  }
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function getCachedPageHtml(articleUrl: string): string | undefined {
  return get(htmlCache, articleUrl);
}

export function setCachedPageHtml(articleUrl: string, html: string): void {
  set(htmlCache, articleUrl, html, HTML_TTL_MS);
}

export function getCachedResolvedImage(articleUrl: string): string | null | undefined {
  return get(imageCache, articleUrl);
}

export function setCachedResolvedImage(
  articleUrl: string,
  imageUrl: string | null
): void {
  set(imageCache, articleUrl, imageUrl, IMAGE_TTL_MS);
}

export function clearImageCaches(): void {
  htmlCache.clear();
  imageCache.clear();
}
