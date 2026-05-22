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

  const [gnews, newsdata, rss] = await Promise.all([
    fetchGNewsAll(),
    fetchNewsDataAll(),
    fetchRssAll(),
  ]);

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
  };
}

export { fetchGNewsAll } from "@/lib/news/providers/gnews";
export { fetchNewsDataAll } from "@/lib/news/providers/newsdata";
export { fetchRssAll } from "@/lib/news/providers/rss";
