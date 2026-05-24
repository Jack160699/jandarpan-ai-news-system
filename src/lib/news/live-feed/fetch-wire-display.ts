/**
 * Lightweight wire fetch for homepage display — quota-conscious (2 GNews + 1 NewsData).
 */

import { isRateLimitError } from "@/lib/news/errors";
import { fetchGNewsCategory } from "@/lib/news/providers/gnews";
import { fetchNewsDataAll } from "@/lib/news/providers/newsdata";
import { fetchRssAll } from "@/lib/news/providers/rss";
import { getNewsProviderEnv } from "@/lib/news/env";
import type { NormalizedArticle } from "@/lib/news/types";
import { errorLiveFeed, logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";

export type WireDisplayFetchResult = {
  articles: NormalizedArticle[];
  errors: string[];
  rateLimited: boolean;
  providersAttempted: string[];
};

const MIN_WIRE_FOR_HOMEPAGE = 4;

export async function fetchWireArticlesForDisplay(
  limit = 60
): Promise<WireDisplayFetchResult> {
  const env = getNewsProviderEnv();
  const errors: string[] = [];
  const providersAttempted: string[] = [];
  let rateLimited = false;
  const articles: NormalizedArticle[] = [];

  if (!env.anyConfigured) {
    warnLiveFeed("wire_skip", { reason: "no_api_keys" });
    return { articles, errors: ["no_providers_configured"], rateLimited, providersAttempted };
  }

  logLiveFeed("wire_fetch_start", {
    gnews: env.gnews,
    newsdata: env.newsdata,
  });

  const tasks: Promise<void>[] = [];

  if (env.gnews) {
    providersAttempted.push("gnews");
    for (const category of ["nation", "business"] as const) {
      tasks.push(
        (async () => {
          try {
            const result = await fetchGNewsCategory(category);
            if (result.error) errors.push(`gnews/${category}: ${result.error}`);
            articles.push(...result.articles);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "gnews failed";
            errors.push(`gnews/${category}: ${msg}`);
            if (isRateLimitError(err)) rateLimited = true;
          }
        })()
      );
    }
  }

  if (env.newsdata && articles.length < MIN_WIRE_FOR_HOMEPAGE) {
    providersAttempted.push("newsdata");
    tasks.push(
      (async () => {
        try {
          const result = await fetchNewsDataAll();
          if (result.errors.length) errors.push(...result.errors.map((e) => `newsdata: ${e}`));
          articles.push(...result.articles);
          if (result.errors.some((e) => /rate|quota|429/i.test(e))) {
            rateLimited = true;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "newsdata failed";
          errors.push(`newsdata: ${msg}`);
          if (isRateLimitError(err)) rateLimited = true;
        }
      })()
    );
  }

  if (articles.length < MIN_WIRE_FOR_HOMEPAGE) {
    providersAttempted.push("rss");
    tasks.push(
      (async () => {
        try {
          const rss = await fetchRssAll();
          if (rss.errors.length) errors.push(...rss.errors.slice(0, 3).map((e) => `rss: ${e}`));
          articles.push(...rss.articles);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "rss failed";
          errors.push(`rss: ${msg}`);
        }
      })()
    );
  }

  await Promise.all(tasks);

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
