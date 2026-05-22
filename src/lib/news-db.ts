/**
 * Supabase read layer — ranked live homepage feed
 */

import { createServerAnonClient, isSupabaseConfigured } from "@/lib/supabase";
import { buildHomepageFeed } from "@/lib/news/home-ranking";
import { normalizeArticlePool } from "@/lib/news/normalize-pool";
import { pickRelatedStories, resolveStorySlug } from "@/lib/news/related-stories";
import { buildArticleSlug } from "@/lib/news/slug";
import type {
  LiveNewsFeed,
  NewsArticleRow,
  NewsCategory,
} from "@/lib/types/news-article";

const POOL_LIMIT = 280;
const PER_CATEGORY = 4;

/** Columns required for homepage — avoids select(*) schema drift */
const POOL_SELECT =
  "id,title,description,content,image_url,source,author,category,article_url,slug,published_at,created_at,updated_at,provider,language,region,title_hash,url_hash,ai_summary,ai_headline,ai_processed_at";

export async function fetchArticlePool(): Promise<NewsArticleRow[]> {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[news-db] fetchArticlePool skipped — missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    return [];
  }

  const supabase = createServerAnonClient();

  let data: NewsArticleRow[] | null = null;
  let error: { message: string; code?: string; details?: string; hint?: string } | null =
    null;
  let count: number | null = null;

  const primary = await supabase
    .from("news_articles")
    .select(POOL_SELECT, { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(POOL_LIMIT);

  data = (primary.data ?? []) as unknown as NewsArticleRow[];
  error = primary.error;
  count = primary.count;

  if (error?.message?.includes("slug")) {
    const fallbackSelect = POOL_SELECT.replace(",slug", "");
    const retry = await supabase
      .from("news_articles")
      .select(fallbackSelect, { count: "exact" })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(POOL_LIMIT);
    data = (retry.data ?? []) as unknown as NewsArticleRow[];
    error = retry.error;
    count = retry.count;
  }

  const articles = normalizeArticlePool(data ?? []);
  console.log("LIVE QUERY RESULT", articles.length, {
    rawRows: data?.length ?? 0,
    tableCount: count ?? null,
    error: error?.message ?? null,
    code: error?.code ?? null,
  });

  if (error) {
    console.error("[news-db] fetchArticlePool:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return articles;
}

/** Homepage feed — uses page ISR (revalidate=60); not unstable_cache to avoid stale empty cache */
export async function getLiveNewsFeed(): Promise<LiveNewsFeed | null> {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[news-db] getLiveNewsFeed — Supabase env not configured on this deployment"
    );
    return null;
  }

  const pool = await fetchArticlePool();
  console.log("LIVE QUERY RESULT", pool.length);

  if (!pool.length) {
    console.warn(
      "[news-db] Empty pool after query — verify RLS policy 'Public read news articles' on news_articles (migration 001 or 005)"
    );
    return null;
  }

  const feed = buildHomepageFeed(pool);
  if (!feed?.hero) {
    console.warn("[news-db] buildHomepageFeed produced no hero", {
      poolSize: pool.length,
    });
  }

  return feed;
}

export async function getArticleBySlug(
  slug: string
): Promise<NewsArticleRow | null> {
  if (!isSupabaseConfigured()) return null;

  const decoded = decodeURIComponent(slug);
  const supabase = createServerAnonClient();

  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .eq("slug", decoded)
    .maybeSingle();

  if (data) return data;

  if (error) {
    console.error("[news-db] getArticleBySlug:", error.message);
  }

  const { data: recent } = await supabase
    .from("news_articles")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(400);

  return (
    recent?.find(
      (row) =>
        row.slug === decoded ||
        resolveStorySlug(row) === decoded ||
        buildArticleSlug(row.title, row.id, row.article_url) === decoded
    ) ?? null
  );
}

export async function getLiveStorySlugs(limit = 500): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createServerAnonClient();
  const { data } = await supabase
    .from("news_articles")
    .select("slug, title, id, article_url")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data ?? []).map((row) => resolveStorySlug(row as NewsArticleRow));
}

export async function getRelatedStoriesForArticle(
  article: NewsArticleRow,
  limit = 6
): Promise<NewsArticleRow[]> {
  const pool = await fetchArticlePool();
  return pickRelatedStories(article, pool, limit);
}

export async function getArticleById(
  id: string
): Promise<NewsArticleRow | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createServerAnonClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[news-db] getArticleById:", error.message);
    return null;
  }

  return data;
}

export function formatPublishedAt(iso: string | null): string {
  if (!iso) return "Just now";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** @deprecated Use getLiveNewsFeed ranked pool */
export async function getArticlesByCategory(
  category: NewsCategory,
  limit = PER_CATEGORY
): Promise<NewsArticleRow[]> {
  const feed = await getLiveNewsFeed();
  return feed?.byCategory[category]?.slice(0, limit) ?? [];
}
