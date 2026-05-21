/**
 * Supabase read layer for live news (Server Components)
 */

import { createServerAnonClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  LiveNewsFeed,
  NewsArticleRow,
  NewsCategory,
} from "@/lib/types/news-article";
import { NEWS_INGEST_CATEGORIES } from "@/lib/types/news-article";

const PER_CATEGORY = 4;
const TRENDING_COUNT = 6;
const LATEST_COUNT = 12;

export async function getArticlesByCategory(
  category: NewsCategory,
  limit = PER_CATEGORY
): Promise<NewsArticleRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createServerAnonClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .eq("category", category)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error(`[news-db] getArticlesByCategory(${category}):`, error.message);
    return [];
  }

  return data ?? [];
}

export async function getLatestArticles(
  limit = LATEST_COUNT
): Promise<NewsArticleRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createServerAnonClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[news-db] getLatestArticles:", error.message);
    return [];
  }

  return data ?? [];
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

/**
 * Build homepage feed: hero, trending, per-category grids, latest strip.
 */
export async function getLiveNewsFeed(): Promise<LiveNewsFeed | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const [latest, ...categoryLists] = await Promise.all([
      getLatestArticles(LATEST_COUNT + 1),
      ...NEWS_INGEST_CATEGORIES.map((c) => getArticlesByCategory(c, PER_CATEGORY)),
    ]);

    if (!latest.length) {
      return null;
    }

    const hero = latest[0] ?? null;
    const trending = latest.slice(1, TRENDING_COUNT + 1);

    const byCategory = NEWS_INGEST_CATEGORIES.reduce(
      (acc, cat, i) => {
        acc[cat] = categoryLists[i] ?? [];
        return acc;
      },
      {} as Record<NewsCategory, NewsArticleRow[]>
    );

    return {
      hero,
      trending,
      byCategory,
      latest,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[news-db] getLiveNewsFeed:", err);
    return null;
  }
}

export function formatPublishedAt(iso: string | null): string {
  if (!iso) return "Recently";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
