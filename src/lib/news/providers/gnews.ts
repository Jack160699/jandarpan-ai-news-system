/**
 * GNews provider — India national headlines
 * https://gnews.io/api/v4/top-headlines
 */

import { fetchJson } from "@/lib/news/http";
import { normalizeImageUrl, pickBestImageCandidate } from "@/lib/news/images/extract";
import { dedupeArticles, isValidHttpUrl, parsePublishedAt } from "@/lib/news/normalize";
import {
  normalizeNewsEncoding,
  safeParsePublishedAt,
} from "@/lib/news/sanitize-article";
import type { NormalizedArticle, ProviderFetchResult } from "@/lib/news/types";

const GNEWS_BASE = "https://gnews.io/api/v4/top-headlines";
const GNEWS_CATEGORY_BATCH_SIZE = 1;
const GNEWS_CATEGORY_DELAY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const title = normalizeNewsEncoding(raw.title);
  const articleUrl = normalizeNewsEncoding(raw.url);

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
    published_at: safeParsePublishedAt(parsePublishedAt(raw.publishedAt)),
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
      { timeoutMs: 18_000, retries: 1, provider: "gnews" }
    );

    if (data.errors?.length) {
      const errMsg = data.errors.join("; ");
      if (/rate|quota|limit/i.test(errMsg)) {
        return { articles: [], error: `GNews quota/rate limit: ${errMsg}` };
      }
    }

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

  const results: Array<{
    category: GNewsCategory;
    articles: NormalizedArticle[];
    error?: string;
  }> = [];

  for (let i = 0; i < GNEWS_CATEGORIES.length; i += GNEWS_CATEGORY_BATCH_SIZE) {
    const chunk = GNEWS_CATEGORIES.slice(i, i + GNEWS_CATEGORY_BATCH_SIZE);
    const settled = await Promise.allSettled(
      chunk.map(async (category) => {
        const result = await fetchGNewsCategory(category);
        return { category, ...result };
      })
    );

    for (let j = 0; j < settled.length; j++) {
      const category = chunk[j];
      const entry = settled[j];
      if (entry.status === "fulfilled") {
        results.push(entry.value);
      } else {
        const msg =
          entry.reason instanceof Error
            ? entry.reason.message
            : "category failed";
        results.push({ category, articles: [], error: msg });
      }
    }

    if (i + GNEWS_CATEGORY_BATCH_SIZE < GNEWS_CATEGORIES.length) {
      await sleep(GNEWS_CATEGORY_DELAY_MS);
    }
  }

  const articles: NormalizedArticle[] = [];
  const errors: string[] = [];
  let fetched = 0;

  for (const r of results) {
    fetched += r.articles.length;
    if (r.error) errors.push(`${r.category}: ${r.error}`);
    articles.push(...r.articles);
  }

  const { unique, skipped } = dedupeArticles(articles, { fuzzy: true });
  if (skipped > 0) {
    console.log(`[gnews] deduped ${skipped} duplicate articles across categories`);
  }

  return {
    provider: "gnews",
    label: "GNews (India)",
    articles: unique,
    fetched,
    valid: unique.length,
    errors,
    durationMs: Date.now() - startedAt,
  };
}
