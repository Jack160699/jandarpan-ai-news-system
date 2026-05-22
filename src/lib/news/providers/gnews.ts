/**
 * GNews provider — India national headlines
 * https://gnews.io/api/v4/top-headlines
 */

import { fetchJson } from "@/lib/news/http";
import { normalizeImageUrl, pickBestImageCandidate } from "@/lib/news/images/extract";
import { isValidHttpUrl, parsePublishedAt } from "@/lib/news/normalize";
import type { NormalizedArticle, ProviderFetchResult } from "@/lib/news/types";

const GNEWS_BASE = "https://gnews.io/api/v4/top-headlines";

export const GNEWS_CATEGORIES = [
  "business",
  "technology",
  "sports",
  "entertainment",
  "health",
  "nation",
] as const;

export type GNewsCategory = (typeof GNEWS_CATEGORIES)[number];

type GNewsArticle = {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  image?: string;
  publishedAt?: string;
  source?: { name?: string; url?: string };
};

type GNewsResponse = {
  totalArticles?: number;
  articles?: GNewsArticle[];
  errors?: string[];
};

function getApiKey(): string | null {
  const key = process.env.GNEWS_API_KEY?.trim();
  return key || null;
}

function mapCategory(gnewsCategory: GNewsCategory): string {
  return gnewsCategory === "nation" ? "politics" : gnewsCategory;
}

function mapArticle(
  raw: GNewsArticle,
  gnewsCategory: GNewsCategory
): NormalizedArticle | null {
  const title = raw.title?.trim();
  const articleUrl = raw.url?.trim();

  if (!title || !articleUrl || !isValidHttpUrl(articleUrl)) return null;

  const imageRaw = raw.image?.trim();
  const imagePick = imageRaw
    ? pickBestImageCandidate([{ url: imageRaw, source: "provider" }])
    : null;

  return {
    title,
    description: raw.description?.trim() ?? null,
    content: raw.content?.trim() ?? null,
    image_url: imagePick ? normalizeImageUrl(imagePick.url, articleUrl) : null,
    source: raw.source?.name?.trim() ?? null,
    author: null,
    category: mapCategory(gnewsCategory),
    published_at: parsePublishedAt(raw.publishedAt),
    article_url: articleUrl,
    provider: "gnews",
    language: "en",
    region: "india",
  };
}

export async function fetchGNewsCategory(
  category: GNewsCategory
): Promise<{ articles: NormalizedArticle[]; error?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { articles: [], error: "GNEWS_API_KEY not configured" };
  }

  const params = new URLSearchParams({
    category,
    country: "in",
    lang: "en",
    max: "15",
    apikey: apiKey,
  });

  try {
    const { data } = await fetchJson<GNewsResponse>(
      `${GNEWS_BASE}?${params.toString()}`,
      { timeoutMs: 18_000, retries: 2 }
    );

    const articles =
      data.articles
        ?.map((a) => mapArticle(a, category))
        .filter((a): a is NormalizedArticle => a !== null) ?? [];

    console.log(`[gnews] ${category}: ${articles.length} valid articles`);
    return { articles };
  } catch (err) {
    const message = err instanceof Error ? err.message : "GNews request failed";
    console.error(`[gnews] ${category}:`, message);
    return { articles: [], error: message };
  }
}

export async function fetchGNewsAll(): Promise<ProviderFetchResult> {
  const startedAt = Date.now();
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      provider: "gnews",
      label: "GNews (India)",
      articles: [],
      fetched: 0,
      valid: 0,
      errors: ["GNEWS_API_KEY not configured"],
      durationMs: Date.now() - startedAt,
    };
  }

  const settled = await Promise.allSettled(
    GNEWS_CATEGORIES.map(async (category) => {
      const result = await fetchGNewsCategory(category);
      return { category, ...result };
    })
  );

  const results = settled.map((entry, i) => {
    const category = GNEWS_CATEGORIES[i];
    if (entry.status === "fulfilled") return entry.value;
    const msg =
      entry.reason instanceof Error ? entry.reason.message : "category failed";
    return { category, articles: [] as NormalizedArticle[], error: msg };
  });

  const articles: NormalizedArticle[] = [];
  const errors: string[] = [];
  let fetched = 0;

  for (const r of results) {
    fetched += r.articles.length;
    if (r.error) errors.push(`${r.category}: ${r.error}`);
    articles.push(...r.articles);
  }

  return {
    provider: "gnews",
    label: "GNews (India)",
    articles,
    fetched,
    valid: articles.length,
    errors,
    durationMs: Date.now() - startedAt,
  };
}
