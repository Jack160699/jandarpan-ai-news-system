/**
 * Typed data access layer — public news reads via anon server client.
 */

import {
  CORE_ARTICLE_SELECT,
  EXTENDED_ARTICLE_SELECT,
  createAnonServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { NewsArticleRow } from "@/lib/types/news-article";

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number | null;
  hasMore: boolean;
  error: string | null;
};

export type QueryResult<T> = {
  data: T | null;
  error: string | null;
};

const DEFAULT_PAGE_SIZE = 24;

function paginate(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  return { from, to, safePage, safeSize };
}

type ArticleQueryResult = {
  rows: NewsArticleRow[];
  count: number | null;
  error: string | null;
};

async function runArticleQuery(
  apply: (
    client: ReturnType<typeof createAnonServerClient>
  ) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
    count: number | null;
  }>
): Promise<ArticleQueryResult> {
  if (!isSupabaseConfigured()) {
    return { rows: [], count: null, error: "Supabase not configured" };
  }

  const supabase = createAnonServerClient();
  const primary = await apply(supabase);

  if (!primary.error) {
    return {
      rows: (primary.data ?? []) as NewsArticleRow[],
      count: primary.count,
      error: null,
    };
  }

  return { rows: [], count: null, error: primary.error.message };
}

/** Latest articles — homepage pool / wire. */
export async function fetchLatestNews(
  params: PaginationParams = {}
): Promise<PaginatedResult<NewsArticleRow>> {
  const { from, to, safePage, safeSize } = paginate(params.page, params.pageSize);

  const { rows, count, error } = await runArticleQuery((client) =>
    client
      .from("news_articles")
      .select(EXTENDED_ARTICLE_SELECT, { count: "exact" })
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to)
  );

  return {
    data: rows,
    page: safePage,
    pageSize: safeSize,
    total: count,
    hasMore: count != null ? from + rows.length < count : rows.length === safeSize,
    error,
  };
}

/** Single article by slug. */
export async function fetchArticleBySlug(
  slug: string
): Promise<QueryResult<NewsArticleRow>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: "Supabase not configured" };
  }

  const decoded = decodeURIComponent(slug);
  const supabase = createAnonServerClient();

  const { data, error } = await supabase
    .from("news_articles")
    .select(EXTENDED_ARTICLE_SELECT)
    .eq("slug", decoded)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (data) return { data: data as NewsArticleRow, error: null };

  return { data: null, error: null };
}

/** Trending — recent articles with images. */
export async function fetchTrendingNews(
  params: PaginationParams & { hours?: number } = {}
): Promise<PaginatedResult<NewsArticleRow>> {
  const hours = params.hours ?? 48;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { from, to, safePage, safeSize } = paginate(params.page, params.pageSize);

  const { rows, count, error } = await runArticleQuery((client) =>
    client
      .from("news_articles")
      .select(EXTENDED_ARTICLE_SELECT, { count: "exact" })
      .gte("published_at", since)
      .not("image_url", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to)
  );

  return {
    data: rows,
    page: safePage,
    pageSize: safeSize,
    total: count,
    hasMore: count != null ? from + rows.length < count : rows.length === safeSize,
    error,
  };
}

/** Regional filter — uses `region` column when present. */
export async function fetchRegionalNews(
  region: string,
  params: PaginationParams = {}
): Promise<PaginatedResult<NewsArticleRow>> {
  const { from, to, safePage, safeSize } = paginate(params.page, params.pageSize);

  const { rows, count, error } = await runArticleQuery((client) =>
    client
      .from("news_articles")
      .select(EXTENDED_ARTICLE_SELECT, { count: "exact" })
      .eq("region", region)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to)
  );

  return {
    data: rows,
    page: safePage,
    pageSize: safeSize,
    total: count,
    hasMore: count != null ? from + rows.length < count : rows.length === safeSize,
    error,
  };
}

/** Category filter. */
export async function fetchNewsByCategory(
  category: string,
  params: PaginationParams = {}
): Promise<PaginatedResult<NewsArticleRow>> {
  const { from, to, safePage, safeSize } = paginate(params.page, params.pageSize);

  const { rows, count, error } = await runArticleQuery((client) =>
    client
      .from("news_articles")
      .select(EXTENDED_ARTICLE_SELECT, { count: "exact" })
      .eq("category", category)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, to)
  );

  return {
    data: rows,
    page: safePage,
    pageSize: safeSize,
    total: count,
    hasMore: count != null ? from + rows.length < count : rows.length === safeSize,
    error,
  };
}
