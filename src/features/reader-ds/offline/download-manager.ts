import type { ReaderArticleModel } from "../article/types";
import {
  deleteOfflineArticle,
  getOfflineArticle,
  getOfflineSettings,
  listOfflineArticles,
  putOfflineArticle,
} from "./db";
import { cacheArticleImages, deleteCachedImages } from "./image-cache";
import { enforceStorageBudget } from "./storage-manager";
import {
  estimateRecordBytes,
  hashContent,
  type DownloadProgress,
  type OfflineArticleRecord,
} from "./types";

export type DownloadInput = {
  model: ReaderArticleModel;
  language: "hi" | "en";
  district?: string | null;
  favorite?: boolean;
  onProgress?: (p: DownloadProgress) => void;
};

function extractInlineImageUrls(paragraphs: string[]): string[] {
  const urls: string[] = [];
  const re = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)/gi;
  for (const p of paragraphs) {
    const m = p.match(re);
    if (m) urls.push(...m);
  }
  return urls;
}

function toRecord(
  model: ReaderArticleModel,
  language: "hi" | "en",
  district: string | null,
  favorite: boolean,
  cachedImageUrls: string[],
  downloadedAt: string
): OfflineArticleRecord {
  const inlineImageUrls = extractInlineImageUrls(model.paragraphs);
  const contentUpdatedAt =
    model.article.updated_at || model.article.published_at || new Date().toISOString();
  const contentHash = hashContent([
    model.headline,
    model.summary ?? "",
    ...model.paragraphs,
    model.imageUrl ?? "",
    contentUpdatedAt,
  ]);
  const base = {
    slug: model.slug,
    downloadedAt,
    contentUpdatedAt,
    contentHash,
    language,
    district,
    category: model.categoryLabel || model.kicker || "",
    headline: model.headline,
    summary: model.summary,
    paragraphs: model.paragraphs,
    heroImageUrl: model.imageUrl,
    imageCaption: model.imageCaption,
    author: model.author,
    role: model.role,
    publishedAt: model.article.published_at ?? null,
    publishedLabel: model.publishedLabel,
    tags: model.tags ?? [],
    kicker: model.kicker,
    favorite,
    inlineImageUrls,
    cachedImageUrls,
  };
  return { ...base, bytes: estimateRecordBytes(base) };
}

export async function isArticleDownloaded(slug: string): Promise<boolean> {
  return Boolean(await getOfflineArticle(slug));
}

export async function downloadArticle(input: DownloadInput): Promise<OfflineArticleRecord> {
  const { model, language, district = null, favorite = false, onProgress } = input;
  const report = (p: DownloadProgress) => onProgress?.(p);

  report({ slug: model.slug, phase: "fetching", progress: 0.1 });

  const existing = await getOfflineArticle(model.slug);
  const imageUrls = [
    model.imageUrl,
    ...extractInlineImageUrls(model.paragraphs),
  ].filter((u): u is string => Boolean(u));

  report({ slug: model.slug, phase: "images", progress: 0.35 });
  const cachedImageUrls = await cacheArticleImages(imageUrls);

  report({ slug: model.slug, phase: "saving", progress: 0.75 });
  const record = toRecord(
    model,
    language,
    district,
    favorite || existing?.favorite || false,
    cachedImageUrls,
    existing?.downloadedAt ?? new Date().toISOString()
  );

  await putOfflineArticle(record);
  await enforceStorageBudget();

  report({ slug: model.slug, phase: "done", progress: 1 });
  return record;
}

/**
 * Refresh only when remote content hash differs.
 * Never overwrites silently — caller must confirm when `needsConfirm`.
 */
export async function prepareRefresh(
  model: ReaderArticleModel,
  language: "hi" | "en"
): Promise<{ needsConfirm: boolean; existing: OfflineArticleRecord | null; nextHash: string }> {
  const existing = await getOfflineArticle(model.slug);
  const nextHash = hashContent([
    model.headline,
    model.summary ?? "",
    ...model.paragraphs,
    model.imageUrl ?? "",
    model.article.updated_at || model.article.published_at || "",
  ]);
  if (!existing) return { needsConfirm: false, existing: null, nextHash };
  return {
    needsConfirm: existing.contentHash !== nextHash,
    existing,
    nextHash,
  };
}

export async function refreshArticle(
  input: DownloadInput & { confirm: boolean }
): Promise<OfflineArticleRecord | null> {
  const prep = await prepareRefresh(input.model, input.language);
  if (prep.existing && prep.needsConfirm && !input.confirm) {
    input.onProgress?.({
      slug: input.model.slug,
      phase: "updating",
      progress: 0,
      message: "confirm-required",
    });
    return null;
  }
  input.onProgress?.({ slug: input.model.slug, phase: "updating", progress: 0.2 });
  return downloadArticle(input);
}

export async function removeDownload(slug: string): Promise<void> {
  const row = await getOfflineArticle(slug);
  if (!row) return;
  await deleteCachedImages(row.cachedImageUrls);
  await deleteOfflineArticle(slug);
}

export async function getLibrary() {
  return listOfflineArticles();
}

export async function getSettings() {
  return getOfflineSettings();
}
