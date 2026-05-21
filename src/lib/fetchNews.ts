/**
 * NewsAPI ingestion utility
 *
 * Fetches top headlines per category and normalizes rows for Supabase.
 * Designed for server-side use only (API route / cron).
 */

import axios from "axios";
import type {
  NewsArticleInsert,
  NewsCategory,
} from "@/lib/types/news-article";
import { NEWS_INGEST_CATEGORIES } from "@/lib/types/news-article";

const NEWS_API_BASE = "https://newsapi.org/v2/top-headlines";

type NewsApiArticle = {
  source?: { id?: string | null; name?: string | null };
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
  content?: string | null;
};

type NewsApiResponse = {
  status: string;
  totalResults?: number;
  articles?: NewsApiArticle[];
  message?: string;
  code?: string;
};

export type FetchCategoryResult = {
  category: NewsCategory;
  fetched: number;
  valid: number;
  error?: string;
};

export type FetchAllNewsResult = {
  ok: boolean;
  categories: FetchCategoryResult[];
  articles: NewsArticleInsert[];
  errors: string[];
};

function getApiKey(): string {
  const key = process.env.NEWS_API_KEY;
  if (!key?.trim()) {
    throw new Error("Missing NEWS_API_KEY environment variable");
  }
  return key.trim();
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function stripContentTruncation(content: string | null | undefined): string | null {
  if (!content) return null;
  return content.replace(/\[\+\d+ chars\]$/i, "").trim() || null;
}

/**
 * Map a single NewsAPI article to our insert shape.
 * Returns null when required fields are missing (invalid row).
 */
export function mapNewsApiArticle(
  raw: NewsApiArticle,
  category: NewsCategory
): NewsArticleInsert | null {
  const title = raw.title?.trim();
  const articleUrl = raw.url?.trim();

  if (!title || !articleUrl || !isValidHttpUrl(articleUrl)) {
    return null;
  }

  if (title === "[Removed]") {
    return null;
  }

  const imageUrl = raw.urlToImage?.trim();
  const publishedAt = raw.publishedAt
    ? new Date(raw.publishedAt).toISOString()
    : null;

  return {
    title,
    description: raw.description?.trim() ?? null,
    content: stripContentTruncation(raw.content),
    image_url:
      imageUrl && isValidHttpUrl(imageUrl) ? imageUrl : null,
    source: raw.source?.name?.trim() ?? raw.source?.id?.trim() ?? null,
    author: raw.author?.trim() ?? null,
    category,
    article_url: articleUrl,
    published_at: publishedAt,
  };
}

/**
 * Fetch headlines for one category (India + category filter).
 */
export async function fetchHeadlinesByCategory(
  category: NewsCategory
): Promise<{ articles: NewsArticleInsert[]; error?: string }> {
  const apiKey = getApiKey();

  try {
    const { data } = await axios.get<NewsApiResponse>(NEWS_API_BASE, {
      params: {
        country: "in",
        category,
        pageSize: 20,
        apiKey,
      },
      timeout: 15_000,
      headers: { Accept: "application/json" },
    });

    if (data.status !== "ok") {
      const msg = data.message ?? `NewsAPI error: ${data.code ?? "unknown"}`;
      console.error(`[fetchNews] ${category}:`, msg);
      return { articles: [], error: msg };
    }

    const mapped =
      data.articles
        ?.map((a) => mapNewsApiArticle(a, category))
        .filter((a): a is NewsArticleInsert => a !== null) ?? [];

    return { articles: mapped };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown NewsAPI request error";
    console.error(`[fetchNews] ${category} request failed:`, message);
    return { articles: [], error: message };
  }
}

/**
 * Fetch all configured categories sequentially (rate-limit friendly).
 */
export async function fetchAllCategoryHeadlines(): Promise<FetchAllNewsResult> {
  const categories: FetchCategoryResult[] = [];
  const articles: NewsArticleInsert[] = [];
  const errors: string[] = [];
  const seenUrls = new Set<string>();

  for (const category of NEWS_INGEST_CATEGORIES) {
    const result = await fetchHeadlinesByCategory(category);

    const deduped = result.articles.filter((a) => {
      if (seenUrls.has(a.article_url)) return false;
      seenUrls.add(a.article_url);
      return true;
    });

    categories.push({
      category,
      fetched: result.articles.length,
      valid: deduped.length,
      error: result.error,
    });

    if (result.error) {
      errors.push(`${category}: ${result.error}`);
    }

    articles.push(...deduped);

    // Small delay between category calls (NewsAPI free tier)
    await new Promise((r) => setTimeout(r, 400));
  }

  return {
    ok: errors.length < NEWS_INGEST_CATEGORIES.length,
    categories,
    articles,
    errors,
  };
}
