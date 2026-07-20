import {
  clearAllOfflineArticles,
  deleteOfflineArticle,
  getOfflineSettings,
  listOfflineArticles,
  putOfflineArticle,
  saveOfflineSettings,
} from "./db";
import { clearImageCache, deleteCachedImages, estimateImageCacheBytes } from "./image-cache";
import type { OfflineArticleRecord, OfflineStorageStats } from "./types";

export async function getStorageStats(): Promise<OfflineStorageStats> {
  const [rows, settings, imagesBytesEstimate] = await Promise.all([
    listOfflineArticles(),
    getOfflineSettings(),
    estimateImageCacheBytes(),
  ]);
  const totalBytes = rows.reduce((n, r) => n + (r.bytes || 0), 0) + imagesBytesEstimate;
  const largest = [...rows]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8)
    .map((r) => ({ slug: r.slug, headline: r.headline, bytes: r.bytes }));
  return {
    articleCount: rows.length,
    totalBytes,
    imagesBytesEstimate,
    limitBytes: settings.storageLimitBytes,
    largest,
  };
}

/**
 * Remove oldest non-favorite downloads until under budget / max count.
 * Favorites are never silently deleted.
 */
export async function enforceStorageBudget(): Promise<{ removed: string[] }> {
  const settings = await getOfflineSettings();
  let rows = await listOfflineArticles();
  const removed: string[] = [];

  const overCount = () => rows.length > settings.maxArticles;
  const overBytes = async () => {
    const stats = await getStorageStats();
    return stats.totalBytes > settings.storageLimitBytes;
  };

  const candidates = () =>
    [...rows]
      .filter((r) => !r.favorite)
      .sort((a, b) => a.downloadedAt.localeCompare(b.downloadedAt));

  while (overCount() || (await overBytes())) {
    const next = candidates()[0];
    if (!next) break;
    await deleteCachedImages(next.cachedImageUrls);
    await deleteOfflineArticle(next.slug);
    removed.push(next.slug);
    rows = rows.filter((r) => r.slug !== next.slug);
  }

  if (removed.length) {
    await saveOfflineSettings({ lastCleanupAt: new Date().toISOString() });
  }
  return { removed };
}

/** Manual: remove downloads older than `days` (skips favorites). */
export async function removeOldDownloads(days: number): Promise<number> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await listOfflineArticles();
  let n = 0;
  for (const r of rows) {
    if (r.favorite) continue;
    if (new Date(r.downloadedAt).getTime() < cutoff) {
      await deleteCachedImages(r.cachedImageUrls);
      await deleteOfflineArticle(r.slug);
      n++;
    }
  }
  return n;
}

export async function deleteAllDownloads(opts?: { includeFavorites?: boolean }): Promise<number> {
  const rows = await listOfflineArticles();
  let n = 0;
  for (const r of rows) {
    if (r.favorite && !opts?.includeFavorites) continue;
    await deleteCachedImages(r.cachedImageUrls);
    await deleteOfflineArticle(r.slug);
    n++;
  }
  if (opts?.includeFavorites) {
    await clearAllOfflineArticles();
    await clearImageCache();
  }
  return n;
}

export async function clearOfflineImageCacheOnly(): Promise<void> {
  await clearImageCache();
  const rows = await listOfflineArticles();
  for (const r of rows) {
    const next: OfflineArticleRecord = { ...r, cachedImageUrls: [] };
    await putOfflineArticle(next);
  }
}

export function formatBytes(bytes: number, locale: "hi" | "en" = "hi"): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return locale === "en" ? `${kb.toFixed(1)} KB` : `${kb.toFixed(1)} केबी`;
  }
  const mb = bytes / (1024 * 1024);
  return locale === "en" ? `${mb.toFixed(1)} MB` : `${mb.toFixed(1)} एमबी`;
}
