/**
 * Incremental provider ingest — AI newsroom pipeline
 *
 * 1. Sanitize + validate
 * 2. Enrich images
 * 3. Persist → news_signals (raw, never public)
 * 4. Bridge → news_articles (legacy homepage, default ON)
 */

import { enrichArticleImages } from "@/lib/news/images/enrich";
import type { ImageEnrichmentAnalytics } from "@/lib/news/images/enrich";
import {
  mergeValidationStats,
  sanitizeNewsArticle,
  validateArticlesForIngest,
  type ArticleValidationStats,
} from "@/lib/news/sanitize-article";
import { revalidateLiveHomepage } from "@/lib/news/revalidate-home";
import {
  persistNewsSignals,
  publishToLegacyArticles,
  logNewsroom,
} from "@/lib/newsroom";
import type { NormalizedArticle, NewsProviderId } from "@/lib/news/types";

export type ProviderIngestResult = {
  provider: NewsProviderId;
  /** Legacy news_articles inserts (homepage bridge) */
  inserted: number;
  skippedDuplicates: number;
  /** Raw news_signals inserts */
  signalsInserted: number;
  signalsSkipped: number;
  signalIds: string[];
  failedValidation: number;
  queuedForAI: number;
  totalFetched: number;
  categoryStats: Record<string, number>;
  failures: Array<{ title: string; reason: string; provider: string }>;
  imageAnalytics: ImageEnrichmentAnalytics | null;
  validationStats: ArticleValidationStats;
};

export async function ingestProviderArticles(
  rawArticles: NormalizedArticle[],
  provider: NewsProviderId,
  options?: {
    maxImagePageFetches?: number;
    revalidateHome?: boolean;
  }
): Promise<ProviderIngestResult> {
  const result: ProviderIngestResult = {
    provider,
    inserted: 0,
    skippedDuplicates: 0,
    signalsInserted: 0,
    signalsSkipped: 0,
    signalIds: [],
    failedValidation: 0,
    queuedForAI: 0,
    totalFetched: rawArticles.length,
    categoryStats: {},
    failures: [],
    imageAnalytics: null,
    validationStats: {
      total: 0,
      sanitized: 0,
      softFixed: 0,
      rejected: 0,
      reasons: {},
    },
  };

  if (!rawArticles.length) return result;

  const preSanitized = rawArticles.map((a) => sanitizeNewsArticle(a).article);
  const { valid, stats, failures } = validateArticlesForIngest(
    preSanitized,
    provider
  );
  result.validationStats = stats;
  result.failedValidation = failures.length;
  result.failures = failures;

  if (!valid.length) {
    logNewsroom("pipeline", "provider_all_rejected", {
      provider,
      total: rawArticles.length,
      validationStats: stats,
    });
    return result;
  }

  const { articles: enriched, analytics } = await enrichArticleImages(valid, {
    maxPageFetches: options?.maxImagePageFetches ?? 12,
  });
  result.imageAnalytics = analytics;

  const postEnrich: NormalizedArticle[] = enriched.map(
    (a) => sanitizeNewsArticle(a).article
  );

  const signalResult = await persistNewsSignals(postEnrich, provider, {
    stage: "ingest",
  });
  result.signalsInserted = signalResult.inserted;
  result.signalsSkipped = signalResult.skippedDuplicates;
  result.signalIds = signalResult.signalIds;

  const legacyResult = await publishToLegacyArticles(postEnrich);
  result.inserted = legacyResult.inserted;
  result.skippedDuplicates = legacyResult.skippedDuplicates;
  result.queuedForAI = legacyResult.queuedForAI;

  for (const article of postEnrich) {
    result.categoryStats[article.category] =
      (result.categoryStats[article.category] ?? 0) + 1;
  }

  if (result.inserted > 0 && options?.revalidateHome !== false) {
    revalidateLiveHomepage();
  }

  logNewsroom("pipeline", "provider_ingest_complete", {
    provider,
    signalsInserted: result.signalsInserted,
    legacyInserted: result.inserted,
    rejected: result.failedValidation,
    queuedForAI: result.queuedForAI,
  });

  return result;
}

export { mergeValidationStats };
