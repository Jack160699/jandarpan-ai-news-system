/**
 * Safe row mapping for homepage pool — tolerate partial ingestion rows
 */

import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";
import { NEWS_INGEST_CATEGORIES } from "@/lib/types/news-article";

const CATEGORY_FALLBACK: NewsCategory = "world";

export function normalizePoolCategory(raw: string | null | undefined): NewsCategory {
  const cat = (raw ?? "world").toLowerCase().trim();
  if ((NEWS_INGEST_CATEGORIES as string[]).includes(cat)) {
    return cat as NewsCategory;
  }
  if (cat === "general" || cat === "national" || cat === "india") return "politics";
  return CATEGORY_FALLBACK;
}

/** Minimum fields required to render a homepage card */
export function normalizePoolArticle(row: NewsArticleRow): NewsArticleRow | null {
  const title = row.title?.trim();
  if (!title || title.length < 4) return null;

  return {
    ...row,
    title,
    description: row.description ?? null,
    content: row.content ?? null,
    image_url: row.image_url ?? null,
    source: row.source ?? null,
    author: row.author ?? null,
    category: normalizePoolCategory(row.category),
    article_url: row.article_url?.trim() || `internal://${row.id}`,
    slug: row.slug ?? null,
    published_at: row.published_at ?? row.created_at ?? null,
    region: row.region ?? null,
    provider: row.provider ?? null,
    language: row.language ?? null,
  };
}

export function normalizeArticlePool(rows: NewsArticleRow[]): NewsArticleRow[] {
  return rows
    .map((row) => normalizePoolArticle(row))
    .filter((row): row is NewsArticleRow => row !== null);
}
