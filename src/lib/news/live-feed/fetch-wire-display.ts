/**
 * Runtime wire fetch — circuit breaker gated, batched, observability instrumented.
 * Prefer ingest → DB path; only called when DB pool is critically low.
 */

import { isRateLimitError } from "@/lib/news/errors";
import { getNewsProviderEnv } from "@/lib/news/env";
import { fetchGNewsCategory } from "@/lib/news/providers/gnews";
import { fetchNewsDataAll } from "@/lib/news/providers/newsdata";
import { fetchRssAll } from "@/lib/news/providers/rss";
import {
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
} from "@/lib/news/providers/circuit-breaker";
import {
  recordProviderMetric,
} from "@/lib/news/live-feed/observability";
import { errorLiveFeed, logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";
import type { NormalizedArticle, NewsProviderId } from "@/lib/news/types";

export type WireDisplayFetchResult = {
  articles: NormalizedArticle[];
  errors: string[];
  rateLimited: boolean;
  providersAttempted: string[];
};

const MIN_WIRE_FOR_HOMEPAGE = 4;

async function runProviderFetch(
  provider: NewsProviderId,
  fn: () => Promise<{ articles: NormalizedArticle[]; errors?: string[]; error?: string }>
): Promise<{ articles: NormalizedArticle[]; error?: string; skipped?: boolean }> {
  if (await isCircuitOpen(provider)) {
    recordProviderMetric({
      provider,
      latencyMs: 0,
      articles: 0,
      success: false,
      circuitOpen: true,
      skipped: true,
    });
    return { articles: [], error: "circuit_open", skipped: true };
  }

  const started = Date.now();
  try {
    const result = await fn();
    const latencyMs = Date.now() - started;
    const articles = result.articles ?? [];
    const err =
      result.error ??
      (result.errors?.length ? result.errors.join("; ") : undefined);

    if (err && !articles.length) {
      const rateLimited = /rate|quota|429/i.test(err);
      await recordCircuitFailure(provider, err, { latencyMs, rateLimited });
      recordProviderMetric({
        provider,
        latencyMs,
        articles: 0,
        success: false,
        rateLimited,
      });
      return { articles: [], error: err };
    }

    await recordCircuitSuccess(provider, {
      latencyMs,
      articleCount: articles.length,
    });
    recordProviderMetric({
      provider,
      latencyMs,
      articles: articles.length,
      success: true,
    });
    return { articles, error: err };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const msg = err instanceof Error ? err.message : `${provider} failed`;
    const rateLimited = isRateLimitError(err);
    await recordCircuitFailure(provider, msg, { latencyMs, rateLimited });
    recordProviderMetric({
      provider,
      latencyMs,
      articles: 0,
      success: false,
      rateLimited,
      timeout: err instanceof Error && err.name === "AbortError",
    });
    return { articles: [], error: msg };
  }
}

/** Uncached wire fetch — use getWireArticlesCached() from homepage resolver */
export async function fetchWireArticlesUncached(
  limit = 60
): Promise<WireDisplayFetchResult> {
  const env = getNewsProviderEnv();
  const errors: string[] = [];
  const providersAttempted: string[] = [];
  let rateLimited = false;
  const articles: NormalizedArticle[] = [];

  if (!env.anyConfigured) {
    warnLiveFeed("wire_skip", { reason: "no_api_keys" });
    return {
      articles,
      errors: ["no_providers_configured"],
      rateLimited,
      providersAttempted,
    };
  }

  logLiveFeed("wire_fetch_start", { gnews: env.gnews, newsdata: env.newsdata });

  const tasks: Promise<void>[] = [];

  if (env.gnews) {
    providersAttempted.push("gnews");
    for (const category of ["nation", "business"] as const) {
      tasks.push(
        (async () => {
          const result = await runProviderFetch("gnews", async () => {
            const r = await fetchGNewsCategory(category);
            return { articles: r.articles, error: r.error };
          });
          if (result.skipped) errors.push(`gnews: circuit_open`);
          else if (result.error) errors.push(`gnews/${category}: ${result.error}`);
          if (result.error && /rate|quota/i.test(result.error)) rateLimited = true;
          articles.push(...result.articles);
        })()
      );
    }
  }

  if (env.newsdata) {
    providersAttempted.push("newsdata");
    tasks.push(
      (async () => {
        const result = await runProviderFetch("newsdata", async () => {
          const r = await fetchNewsDataAll();
          return { articles: r.articles, errors: r.errors };
        });
        if (result.skipped) errors.push("newsdata: circuit_open");
        else if (result.error) errors.push(`newsdata: ${result.error}`);
        if (result.error && /rate|quota/i.test(result.error)) rateLimited = true;
        articles.push(...result.articles);
      })()
    );
  }

  await Promise.all(tasks);

  if (articles.length < MIN_WIRE_FOR_HOMEPAGE) {
    providersAttempted.push("rss");
    const rss = await runProviderFetch("rss", async () => {
      const r = await fetchRssAll();
      return { articles: r.articles, errors: r.errors };
    });
    if (rss.error) errors.push(`rss: ${rss.error}`);
    articles.push(...rss.articles);
  }

  const deduped: NormalizedArticle[] = [];
  const seen = new Set<string>();
  for (const a of articles) {
    const key = a.article_url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
    if (deduped.length >= limit) break;
  }

  logLiveFeed("wire_fetch_done", {
    count: deduped.length,
    errors: errors.length,
    rateLimited,
    providersAttempted,
  });

  if (!deduped.length && errors.length) {
    errorLiveFeed("wire_fetch_empty", { errors: errors.slice(0, 5), rateLimited });
  }

  return {
    articles: deduped,
    errors,
    rateLimited,
    providersAttempted,
  };
}

/** @deprecated Use getWireArticlesCached — kept for direct tests */
export async function fetchWireArticlesForDisplay(
  limit = 60
): Promise<WireDisplayFetchResult> {
  const { getWireArticlesCached } = await import("@/lib/news/live-feed/wire-cache");
  return getWireArticlesCached(limit);
}
