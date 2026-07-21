import { OFFLINE_IMAGE_CACHE } from "./types";

async function openImageCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  return caches.open(OFFLINE_IMAGE_CACHE);
}

/** Cache only URLs that appear on the downloaded article. */
export async function cacheArticleImages(urls: string[]): Promise<string[]> {
  const cache = await openImageCache();
  if (!cache) return [];
  const saved: string[] = [];
  const unique = [...new Set(urls.filter(Boolean))];
  for (const url of unique) {
    try {
      const abs = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://local").href;
      const existing = await cache.match(abs);
      if (existing) {
        saved.push(abs);
        continue;
      }
      const res = await fetch(abs, { mode: "cors", credentials: "omit", cache: "force-cache" });
      if (!res.ok) continue;
      // Opaque or CORS — store clone when possible
      await cache.put(abs, res.clone());
      saved.push(abs);
    } catch {
      // Skip failed images — article text still offline
    }
  }
  return saved;
}

export async function deleteCachedImages(urls: string[]): Promise<void> {
  const cache = await openImageCache();
  if (!cache) return;
  for (const url of urls) {
    try {
      await cache.delete(url);
    } catch {
      /* ignore */
    }
  }
}

export async function clearImageCache(): Promise<void> {
  if (typeof caches === "undefined") return;
  await caches.delete(OFFLINE_IMAGE_CACHE);
}

export async function estimateImageCacheBytes(): Promise<number> {
  const cache = await openImageCache();
  if (!cache) return 0;
  const keys = await cache.keys();
  let total = 0;
  for (const req of keys) {
    const res = await cache.match(req);
    if (!res) continue;
    const cl = res.headers.get("content-length");
    if (cl) total += Number(cl) || 0;
    else {
      try {
        const buf = await res.clone().arrayBuffer();
        total += buf.byteLength;
      } catch {
        total += 40_000;
      }
    }
  }
  return total;
}
