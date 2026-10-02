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

/**
 * Query set, retargeted to the editorial coverage policy. The previous three queries were generic national/world
 * "top" feeds: 96% of what they returned was not Chhattisgarh and 0-17% carried usable article text.
 *   1-2  the four primary districts (Hindi + English spellings)      3  statewide Chhattisgarh
 *   4    major national headlines only ("top" = the provider's editorial front page)
 * International stories come from the BBC World / Google News international feeds; there is no NewsData world query.
 * q stays well under the 100-char free-plan limit.
 */
export const NEWSDATA_QUERIES: ReadonlyArray<Record<string, string>> = [
  { country: "in", language: "hi", q: "रायपुर OR दुर्ग OR भिलाई OR बिलासपुर OR राजनांदगांव" },
  { country: "in", language: "en", q: "Raipur OR Durg OR Bhilai OR Bilaspur OR Rajnandgaon" },
  { country: "in", language: "hi", q: "छत्तीसगढ़" },
  { country: "in", language: "hi,en", category: "top" },
];

/**
 * Free plan = 200 credits/day and every query costs one. This runs on one shard every 10 minutes (144 runs/day x 4
 * queries = 576 credits), so unthrottled it exhausts the quota by mid-morning and then yields nothing all day.
 * One run per 40 min = 36 runs x 4 queries = 144 credits/day, ~28% headroom.
 */
export const NEWSDATA_MIN_INTERVAL_MS = 40 * 60_000;

/** Pure: is a NewsData run due, given when the last one was attempted? */
export function isNewsDataDue(lastAttemptedIso: string | null | undefined, now: number = Date.now()): boolean {
  const last = lastAttemptedIso ? new Date(lastAttemptedIso).getTime() : NaN;
  return !Number.isFinite(last) || now - last >= NEWSDATA_MIN_INTERVAL_MS;
}

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

    // keyword (district) queries are Chhattisgarh-targeted; only the untargeted fallback is "world"
    const category = params.category ?? (params.q ? "chhattisgarh" : "world");
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
    buildSourceKey,
    filterArticlesByPublishedAfter,
    loadIngestionSourceState,
    publishedAfterIsoFromCursor,
  } = await import("@/lib/news/ingestion/source-state");

  const sourceKey = buildSourceKey("newsdata", "api");
  const state = await loadIngestionSourceState(sourceKey);

  const lastPoll = [state?.last_attempted_at, state?.last_successful_at]
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop();
  if (!isNewsDataDue(lastPoll)) {
    return {
      provider: "newsdata",
      label: "NewsData.io (district-targeted; throttled to protect the daily credit quota)",
      articles: [],
      fetched: 0,
      valid: 0,
      errors: [],
      durationMs: Date.now() - startedAt,
    };
  }
  const { upsertIngestionSourceState } = await import("@/lib/news/ingestion/source-state");
  await upsertIngestionSourceState({
    source_key: sourceKey,
    provider_family: "newsdata",
    last_attempted_at: new Date().toISOString(),
  }).catch(() => undefined);
  // NewsData /latest and /news reject from_date on this plan/endpoint (HTTP 422
  // UnsupportedParameter). Keep incremental behaviour via client-side windowing.
  const publishedAfter = publishedAfterIsoFromCursor(
    state?.last_item_timestamp ?? null
  );

  const results = await Promise.all(NEWSDATA_QUERIES.map((q) => fetchNewsDataQuery({ ...q })));

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

  // Stamp cursor metadata; advance ONLY after successful persist.
  const stamped = unique.map((a) => ({
    ...a,
    ingestion_source_key: sourceKey,
    ingestion_cursor_expected: state?.last_item_timestamp ?? null,
  }));

  return {
    provider: "newsdata",
    label: "NewsData.io (district-targeted)",
    articles: stamped,
    fetched,
    valid: stamped.length,
    errors,
    durationMs: Date.now() - startedAt,
  };
}
