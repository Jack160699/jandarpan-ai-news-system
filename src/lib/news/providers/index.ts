/**
 * Hybrid provider orchestrator — parallel fetch, merge, dedupe
 */

import { dedupeArticles } from "@/lib/news/normalize";
import type { HybridFetchResult } from "@/lib/news/types";
import { fetchGNewsAll } from "@/lib/news/providers/gnews";
import { fetchNewsDataAll } from "@/lib/news/providers/newsdata";
import { fetchRssAll } from "@/lib/news/providers/rss";

export async function fetchAllNewsProviders(): Promise<HybridFetchResult> {
  const startedAt = Date.now();

  console.log("[ingest] Starting parallel provider fetch…");

  const [gnews, newsdata, rssResult] = await Promise.all([
    fetchGNewsAll().catch((e) => emptyProvider("gnews", "GNews", e)),
    fetchNewsDataAll().catch((e) => emptyProvider("newsdata", "NewsData.io", e)),
    fetchRssAll().catch((e) => emptyRss(e)),
  ]);

  const rss = rssResult;

  const providers = [gnews, newsdata, rss];
  const merged = [...gnews.articles, ...newsdata.articles, ...rss.articles];
  const { unique, skipped } = dedupeArticles(merged);

  const errors = providers.flatMap((p) =>
    p.errors.map((e) => `${p.provider}: ${e}`)
  );

  const hasAnyProvider = providers.some((p) => p.articles.length > 0);
  const configuredCount = [
    process.env.GNEWS_API_KEY,
    process.env.NEWSDATA_API_KEY,
    true,
  ].filter(Boolean).length;

  console.log(
    `[ingest] Fetched ${merged.length}, deduped ${unique.length} (skipped ${skipped}), providers ok: ${hasAnyProvider}`
  );

  return {
    ok: hasAnyProvider || configuredCount === 0,
    providers,
    articles: unique,
    errors,
    durationMs: Date.now() - startedAt,
    rssAnalytics: rss.sourceAnalytics,
    healthySources: rss.healthySources,
    failedSources: rss.failedSources,
    articlesRecoveredByFallback: rss.articlesRecoveredByFallback,
  };
}

function emptyProvider(
  provider: "gnews" | "newsdata",
  label: string,
  err: unknown
): import("@/lib/news/types").ProviderFetchResult {
  const msg = err instanceof Error ? err.message : "provider failed";
  return {
    provider,
    label,
    articles: [],
    fetched: 0,
    valid: 0,
    errors: [msg],
    durationMs: 0,
  };
}

function emptyRss(err: unknown): import("@/lib/news/providers/rss").RssFetchResult {
  const msg = err instanceof Error ? err.message : "RSS failed";
  return {
    provider: "rss",
    label: "RSS",
    articles: [],
    fetched: 0,
    valid: 0,
    errors: [msg],
    durationMs: 0,
    sourceAnalytics: [],
    healthySources: [],
    failedSources: [],
    articlesRecoveredByFallback: 0,
  };
}

export { fetchGNewsAll } from "@/lib/news/providers/gnews";
export { fetchNewsDataAll } from "@/lib/news/providers/newsdata";
export { fetchRssAll } from "@/lib/news/providers/rss";
