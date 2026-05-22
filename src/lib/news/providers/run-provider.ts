/**
 * Parallel provider runners — GNews + NewsData with timeouts
 */

import { fetchWithTimeout } from "@/lib/serverless/fetch-timeout";
import { fetchGNewsAll } from "@/lib/news/providers/gnews";
import { fetchNewsDataAll } from "@/lib/news/providers/newsdata";
import type { NormalizedArticle, NewsProviderId } from "@/lib/news/types";

export type ProviderRunResult = {
  provider: NewsProviderId;
  articles: NormalizedArticle[];
  durationMs: number;
  errors: string[];
};

async function runGNews(): Promise<ProviderRunResult> {
  const startedAt = Date.now();
  try {
    const result = await fetchWithTimeout(() => fetchGNewsAll());
    return {
      provider: "gnews",
      articles: result.articles,
      durationMs: Date.now() - startedAt,
      errors: result.errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GNews failed";
    return {
      provider: "gnews",
      articles: [],
      durationMs: Date.now() - startedAt,
      errors: [msg],
    };
  }
}

async function runNewsData(): Promise<ProviderRunResult> {
  const startedAt = Date.now();
  try {
    const result = await fetchWithTimeout(() => fetchNewsDataAll());
    return {
      provider: "newsdata",
      articles: result.articles,
      durationMs: Date.now() - startedAt,
      errors: result.errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "NewsData failed";
    return {
      provider: "newsdata",
      articles: [],
      durationMs: Date.now() - startedAt,
      errors: [msg],
    };
  }
}

/** GNews + NewsData in parallel (each capped at 8s) */
export async function runParallelApiProviders(): Promise<ProviderRunResult[]> {
  const settled = await Promise.allSettled([runGNews(), runNewsData()]);

  return settled.map((entry, i) => {
    if (entry.status === "fulfilled") return entry.value;
    const provider: NewsProviderId = i === 0 ? "gnews" : "newsdata";
    const msg =
      entry.reason instanceof Error ? entry.reason.message : "provider crashed";
    return {
      provider,
      articles: [],
      durationMs: 0,
      errors: [msg],
    };
  });
}
