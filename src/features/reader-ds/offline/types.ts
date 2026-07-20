/**
 * Offline article package — device-local only.
 * Bodies live in IndexedDB; images in Cache Storage.
 */

export const OFFLINE_DB_NAME = "jd-offline-v1";
export const OFFLINE_DB_VERSION = 1;
export const OFFLINE_STORE = "articles";
export const OFFLINE_META_STORE = "meta";
export const OFFLINE_IMAGE_CACHE = "jd-offline-images-v1";

/** Soft budget — cleanup starts when exceeded (favorites kept). */
export const DEFAULT_STORAGE_LIMIT_BYTES = 80 * 1024 * 1024;
export const DEFAULT_MAX_ARTICLES = 50;

export type OfflineArticleRecord = {
  slug: string;
  downloadedAt: string;
  contentUpdatedAt: string;
  contentHash: string;
  language: "hi" | "en";
  district: string | null;
  category: string;
  headline: string;
  summary: string | null;
  paragraphs: string[];
  heroImageUrl: string | null;
  imageCaption: string | null;
  author: string;
  role: string;
  publishedAt: string | null;
  publishedLabel: string | null;
  tags: string[];
  kicker: string;
  bytes: number;
  favorite: boolean;
  inlineImageUrls: string[];
  cachedImageUrls: string[];
};

export type OfflineMeta = {
  key: "settings";
  storageLimitBytes: number;
  maxArticles: number;
  lastCleanupAt: string | null;
};

export type OfflineSort = "newest" | "oldest" | "district" | "category";

export type OfflineStorageStats = {
  articleCount: number;
  totalBytes: number;
  imagesBytesEstimate: number;
  limitBytes: number;
  largest: Array<{ slug: string; headline: string; bytes: number }>;
};

export type DownloadProgress = {
  slug: string;
  phase: "idle" | "fetching" | "images" | "saving" | "done" | "error" | "removing" | "updating";
  progress: number;
  message?: string;
};

export function estimateRecordBytes(record: Omit<OfflineArticleRecord, "bytes">): number {
  const json = JSON.stringify(record);
  // UTF-16 approximation + image payload tracked separately via cachedImageUrls length
  return json.length * 2 + record.cachedImageUrls.length * 40_000;
}

export function hashContent(parts: string[]): string {
  const s = parts.join("\u0001");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
