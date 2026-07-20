/**
 * NewsData.io provider — global & multi-language headlines
 * https://newsdata.io/documentation
 */

import { fetchJson } from "@/lib/news/http";
import { normalizeImageUrl, pickBestImageCandidate } from "@/lib/news/images/extract";
import { dedupeArticles, isValidHttpUrl, parsePublishedAt } from "@/lib/news/normalize";
import {
  normalizeNewsEncoding,
  safeParsePublishedAt,
} from "@/lib/news/sanitize-article";
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
  const title = normalizeNewsEncoding(raw.title);
  const articleUrl = normalizeNewsEncoding(raw.link);

  if (!title || !articleUrl || !isValidHttpUrl(articleUrl)) return null;

  const imageRaw = raw.image_url?.trim();
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
    image_url: imageRaw
      ? pickBestImageCandidate([{ url: imageRaw, source: "provider" }])
        ? normalizeImageUrl(imageRaw, articleUrl)
        : null
      : null,
    source: raw.source_name?.trim() ?? raw.source_id?.trim() ?? null,
    author: creator,
    category: category === "top" ? defaultCategory : category,
    published_at: safeParsePublishedAt(parsePublishedAt(raw.pubDate)),
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
      { timeoutMs: 20_000, retries: 2, provider: "newsdata" }
    );

    if (data.status && data.status !== "success") {
      const msg = data.message ?? `NewsData status: ${data.status}`;
      const isQuota = /rate|quota|limit|429/i.test(msg);
      return {
        articles: [],
        error: isQuota ? `NewsData quota/rate limit: ${msg}` : msg,
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

  const {
    advanceSourceCursorSafe,
    buildSourceKey,
    filterArticlesByPublishedAfter,
    loadIngestionSourceState,
    publishedAfterIsoFromCursor,
  } = await import("@/lib/news/ingestion/source-state");

  const sourceKey = buildSourceKey("newsdata", "api");
  const state = await loadIngestionSourceState(sourceKey);
  // NewsData /latest and /news reject from_date on this plan/endpoint (HTTP 422
  // UnsupportedParameter). Keep incremental behaviour via client-side windowing.
  const publishedAfter = publishedAfterIsoFromCursor(
    state?.last_item_timestamp ?? null
  );

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

  const { kept: windowed, filtered } = filterArticlesByPublishedAfter(
    articles,
    publishedAfter
  );
  if (filtered > 0) {
    console.log(`[newsdata] incremental filtered ${filtered} older items`);
  }

  const { unique, skipped } = dedupeArticles(windowed, { fuzzy: true });
  if (skipped > 0) {
    console.log(`[newsdata] deduped ${skipped} duplicate articles across queries`);
  }

  const newest = unique
    .map((a) => a.published_at)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  if (newest) {
    await advanceSourceCursorSafe({
      sourceKey,
      providerFamily: "newsdata",
      expectedPrevious: state?.last_item_timestamp ?? null,
      nextTimestamp: newest,
      newItemCount: unique.length,
    });
  }

  return {
    provider: "newsdata",
    label: "NewsData.io (India + Global)",
    articles: unique,
    fetched,
    valid: unique.length,
    errors,
    durationMs: Date.now() - startedAt,
  };
}
