/**
 * NewsData.io provider — global & multi-language headlines
 * https://newsdata.io/documentation
 */

import { fetchJson } from "@/lib/news/http";
import { isValidHttpUrl, parsePublishedAt } from "@/lib/news/normalize";
import type { NormalizedArticle, ProviderFetchResult } from "@/lib/news/types";

const NEWSDATA_BASE = "https://newsdata.io/api/1/news";

type NewsDataArticle = {
  title?: string;
  description?: string;
  content?: string;
  link?: string;
  image_url?: string;
  pubDate?: string;
  source_id?: string;
  source_name?: string;
  creator?: string | string[];
  category?: string[];
  language?: string;
  country?: string[];
};

type NewsDataResponse = {
  status?: string;
  results?: NewsDataArticle[];
  message?: string;
};

function getApiKey(): string | null {
  const key = process.env.NEWSDATA_API_KEY?.trim();
  return key || null;
}

function mapArticle(
  raw: NewsDataArticle,
  defaultCategory: string,
  region: "india" | "global"
): NormalizedArticle | null {
  const title = raw.title?.trim();
  const articleUrl = raw.link?.trim();

  if (!title || !articleUrl || !isValidHttpUrl(articleUrl)) return null;

  const imageUrl = raw.image_url?.trim();
  const category =
    raw.category?.[0]?.toLowerCase().replace(/\s+/g, "_") ?? defaultCategory;

  const creator = Array.isArray(raw.creator)
    ? raw.creator[0]?.trim()
    : typeof raw.creator === "string"
      ? raw.creator.trim()
      : null;

  return {
    title,
    description: raw.description?.trim() ?? null,
    content: raw.content?.trim() ?? null,
    image_url: imageUrl && isValidHttpUrl(imageUrl) ? imageUrl : null,
    source: raw.source_name?.trim() ?? raw.source_id?.trim() ?? null,
    author: creator,
    category: category === "top" ? defaultCategory : category,
    published_at: parsePublishedAt(raw.pubDate),
    article_url: articleUrl,
    provider: "newsdata",
    language: raw.language ?? (region === "india" ? "en" : "en"),
    region: region === "india" ? "india" : "global",
  };
}

async function fetchNewsDataQuery(params: Record<string, string>): Promise<{
  articles: NormalizedArticle[];
  error?: string;
}> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { articles: [], error: "NEWSDATA_API_KEY not configured" };
  }

  const qs = new URLSearchParams({ ...params, apikey: apiKey });

  try {
    const { data } = await fetchJson<NewsDataResponse>(
      `${NEWSDATA_BASE}?${qs.toString()}`,
      { timeoutMs: 20_000, retries: 2 }
    );

    if (data.status && data.status !== "success") {
      return {
        articles: [],
        error: data.message ?? `NewsData status: ${data.status}`,
      };
    }

    const category = params.category ?? "world";
    const region = params.country === "in" ? "india" : "global";

    const articles =
      data.results
        ?.map((a) => mapArticle(a, category, region))
        .filter((a): a is NormalizedArticle => a !== null) ?? [];

    console.log(
      `[newsdata] ${params.country ?? "global"}/${category}: ${articles.length} articles`
    );

    return { articles };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "NewsData request failed";
    console.error("[newsdata]", message);
    return { articles: [], error: message };
  }
}

export async function fetchNewsDataAll(): Promise<ProviderFetchResult> {
  const startedAt = Date.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      provider: "newsdata",
      label: "NewsData.io",
      articles: [],
      fetched: 0,
      valid: 0,
      errors: ["NEWSDATA_API_KEY not configured"],
      durationMs: Date.now() - startedAt,
    };
  }

  const queries = [
    { country: "in", language: "en,hi", category: "top" },
    { country: "in", language: "hi", category: "top" },
    { category: "world", language: "en" },
  ];

  const results = await Promise.all(
    queries.map((q) => fetchNewsDataQuery(q as Record<string, string>))
  );

  const articles: NormalizedArticle[] = [];
  const errors: string[] = [];
  let fetched = 0;

  for (const r of results) {
    fetched += r.articles.length;
    if (r.error) errors.push(r.error);
    articles.push(...r.articles);
  }

  return {
    provider: "newsdata",
    label: "NewsData.io (India + Global)",
    articles,
    fetched,
    valid: articles.length,
    errors,
    durationMs: Date.now() - startedAt,
  };
}
