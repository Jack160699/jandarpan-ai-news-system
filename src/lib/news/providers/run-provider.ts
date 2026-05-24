/**
 * Parallel provider runners — GNews + NewsData with retries, health gates
 */

import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import {
  isApiProviderDisabled,
  loadApiProviderHealth,
  recordApiProviderFailure,
  recordApiProviderSuccess,
} from "@/lib/infrastructure/providers/api-health";
import { withProviderRetry } from "@/lib/infrastructure/providers/retry";
import { fetchGNewsAll } from "@/lib/news/providers/gnews";
import { fetchNewsDataAll } from "@/lib/news/providers/newsdata";
import type { NormalizedArticle, NewsProviderId } from "@/lib/news/types";

export type ProviderRunResult = {
  provider: NewsProviderId;
  articles: NormalizedArticle[];
  durationMs: number;
  errors: string[];
  skipped?: boolean;
  healthScore?: number;
};

async function runGNews(
  health: Awaited<ReturnType<typeof loadApiProviderHealth>>
): Promise<ProviderRunResult> {
  const provider: NewsProviderId = "gnews";
  if (await isApiProviderDisabled(provider, health)) {
    logIngestionAnalytics({
      event: "provider_disabled",
      provider,
    });
    return {
      provider,
      articles: [],
      durationMs: 0,
      errors: ["provider_disabled_by_health"],
      skipped: true,
      healthScore: 0,
    };
  }

  const startedAt = Date.now();
  try {
    const result = await withProviderRetry(provider, () => fetchGNewsAll());
    const durationMs = Date.now() - startedAt;
    await recordApiProviderSuccess(provider, health, {
      articleCount: result.articles.length,
      latencyMs: durationMs,
    });
    logIngestionAnalytics({
      event: "provider_fetch",
      provider,
      durationMs,
      fetched: result.articles.length,
    });
    return {
      provider,
      articles: result.articles,
      durationMs,
      errors: result.errors,
      healthScore: health.get(provider)?.health_score,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GNews failed";
    await recordApiProviderFailure(provider, health, msg);
    return {
      provider,
      articles: [],
      durationMs: Date.now() - startedAt,
      errors: [msg],
      healthScore: health.get(provider)?.health_score,
    };
  }
}

async function runNewsData(
  health: Awaited<ReturnType<typeof loadApiProviderHealth>>
): Promise<ProviderRunResult> {
  const provider: NewsProviderId = "newsdata";
  if (await isApiProviderDisabled(provider, health)) {
    logIngestionAnalytics({
      event: "provider_disabled",
      provider,
    });
    return {
      provider,
      articles: [],
      durationMs: 0,
      errors: ["provider_disabled_by_health"],
      skipped: true,
      healthScore: 0,
    };
  }

  const startedAt = Date.now();
  try {
    const result = await withProviderRetry(provider, () => fetchNewsDataAll());
    const durationMs = Date.now() - startedAt;
    await recordApiProviderSuccess(provider, health, {
      articleCount: result.articles.length,
      latencyMs: durationMs,
    });
    logIngestionAnalytics({
      event: "provider_fetch",
      provider,
      durationMs,
      fetched: result.articles.length,
    });
    return {
      provider,
      articles: result.articles,
      durationMs,
      errors: result.errors,
      healthScore: health.get(provider)?.health_score,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "NewsData failed";
    await recordApiProviderFailure(provider, health, msg);
    return {
      provider,
      articles: [],
      durationMs: Date.now() - startedAt,
      errors: [msg],
      healthScore: health.get(provider)?.health_score,
    };
  }
}

/** GNews + NewsData in parallel (retry + health scoring) */
export async function runParallelApiProviders(): Promise<ProviderRunResult[]> {
  const health = await loadApiProviderHealth();
  const settled = await Promise.allSettled([runGNews(health), runNewsData(health)]);

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
