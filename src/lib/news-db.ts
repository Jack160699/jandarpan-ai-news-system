/**
 * Supabase read layer — ranked live homepage feed
 */

import { unstable_cache } from "next/cache";
import { createServerAnonClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  buildHomepageFeed,
  LIVE_NEWS_CACHE_TAG,
} from "@/lib/news/home-ranking";
import type {
  LiveNewsFeed,
  NewsArticleRow,
  NewsCategory,
} from "@/lib/types/news-article";

const POOL_LIMIT = 280;
const PER_CATEGORY = 4;

async function fetchArticlePool(): Promise<NewsArticleRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createServerAnonClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(POOL_LIMIT);

  if (error) {
    console.error("[news-db] fetchArticlePool:", error.message);
    return [];
  }

  return data ?? [];
}

async function buildLiveNewsFeed(): Promise<LiveNewsFeed | null> {
  const pool = await fetchArticlePool();
  return buildHomepageFeed(pool);
}

/** Cached feed — tag `live-news` for ingestion revalidation */
export async function getLiveNewsFeed(): Promise<LiveNewsFeed | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    return await unstable_cache(
      buildLiveNewsFeed,
      ["live-news-feed-v2"],
      {
        tags: [LIVE_NEWS_CACHE_TAG],
        revalidate: 60,
      }
    )();
  } catch (err) {
    console.error("[news-db] getLiveNewsFeed:", err);
    return buildLiveNewsFeed();
  }
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
