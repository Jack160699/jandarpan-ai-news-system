/**
 * Incremental provider ingest — AI newsroom pipeline
 *
 * 1. Sanitize + validate
 * 2. In-memory + early DB duplicate filter (before expensive work)
 * 3. Enrich images (novel items only)
 * 4. Persist → news_signals (raw, never public)
 * 5. Bridge → news_articles (legacy homepage, default ON)
 */

import { enrichArticleImages } from "@/lib/news/images/enrich";
import type { ImageEnrichmentAnalytics } from "@/lib/news/images/enrich";
import {
  emptyEarlyDedupMetrics,
  filterKnownSignalDuplicates,
  type EarlyDedupMetrics,
} from "@/lib/news/ingestion/early-dedup";
import {
  mergeValidationStats,
  sanitizeNewsArticle,
  validateArticlesForIngest,
  type ArticleValidationStats,
} from "@/lib/news/sanitize-article";
import { dedupeArticles } from "@/lib/news/normalize";
import { revalidateLiveHomepage } from "@/lib/news/revalidate-home";
import {
  persistNewsSignals,
  publishToLegacyArticles,
  logNewsroom,
} from "@/lib/newsroom";
import type { NormalizedArticle, NewsProviderId } from "@/lib/news/types";
import { logIngestTrace } from "@/lib/news/pipeline/ingest-trace";

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
  earlyDedup: EarlyDedupMetrics;
  /** In-memory URL/title dups before DB early filter */
  memoryDuplicates: number;
  /** Rows attempted for news_signals upsert */
  attemptedInserts: number;
  failedBatches: number;
  failedRows: number;
  persistenceErrors: string[];
  allBatchesFailed: boolean;
  partialPersistence: boolean;
  persistenceFailed: boolean;
};

export async function ingestProviderArticles(
  rawArticles: NormalizedArticle[],
  provider: NewsProviderId,
  options?: {
    maxImagePageFetches?: number;
    revalidateHome?: boolean;
    tenantId?: string | null;
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
    earlyDedup: emptyEarlyDedupMetrics(),
    memoryDuplicates: 0,
    attemptedInserts: 0,
    failedBatches: 0,
    failedRows: 0,
    persistenceErrors: [],
    allBatchesFailed: false,
    partialPersistence: false,
    persistenceFailed: false,
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
    logIngestTrace("validation_all_rejected", {
      provider,
      totalFetched: rawArticles.length,
      validationStats: stats,
      sampleFailures: failures.slice(0, 5),
      firstFailure: failures[0] ?? null,
    });
    logNewsroom("pipeline", "provider_all_rejected", {
      provider,
      total: rawArticles.length,
      validationStats: stats,
    });
    return result;
  }

  logIngestTrace("validation_passed", {
    provider,
    totalFetched: rawArticles.length,
    validCount: valid.length,
    rejectedCount: failures.length,
    validationStats: stats,
    sampleFailures: failures.slice(0, 3),
  });

  const { unique: dedupedValid, skipped: urlDuplicates } = dedupeArticles(valid, {
    fuzzy: true,
  });
  result.memoryDuplicates = urlDuplicates;
  if (urlDuplicates > 0) {
    logIngestTrace("provider_articles_deduped", {
      provider,
      duplicateCount: urlDuplicates,
      inputCount: valid.length,
      outputCount: dedupedValid.length,
    });
  }

  // Step 3: reject known signals BEFORE image enrichment / page fetches.
  const early = await filterKnownSignalDuplicates(dedupedValid, {
    tenantId: options?.tenantId ?? null,
  });
  result.earlyDedup = early.metrics;
  result.skippedDuplicates =
    urlDuplicates +
    early.metrics.earlyDuplicateKnownSignal +
    early.metrics.earlyDuplicateBatch;

  logIngestTrace("early_dedup_complete", {
    provider,
    input: early.metrics.input,
    passed: early.metrics.passed,
    knownSignalDupes: early.metrics.earlyDuplicateKnownSignal,
    batchDupes: early.metrics.earlyDuplicateBatch,
  });

  if (!early.novel.length) {
    logNewsroom("pipeline", "provider_all_early_duplicates", {
      provider,
      total: rawArticles.length,
      earlyDedup: early.metrics,
    });
    return result;
  }

  const { articles: enriched, analytics } = await enrichArticleImages(early.novel, {
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
  result.attemptedInserts = signalResult.attempted;
  result.failedBatches = signalResult.failedBatches;
  result.failedRows = signalResult.failedRows;
  result.persistenceErrors = signalResult.persistenceErrors;
  result.allBatchesFailed = signalResult.allBatchesFailed;
  result.partialPersistence = signalResult.partialPersistence;
  result.persistenceFailed =
    signalResult.allBatchesFailed ||
    (signalResult.failedBatches > 0 && signalResult.inserted === 0);
  // Preserve early + upsert duplicates honestly (do not overwrite early count).
  result.skippedDuplicates += signalResult.skippedDuplicates;

  // Advance source cursors only after successful persistence (never after
  // failed_persistence). Group by ingestion_source_key stamped at fetch.
  if (
    !result.persistenceFailed &&
    !signalResult.allBatchesFailed &&
    signalResult.failedBatches === 0 &&
    postEnrich.length > 0
  ) {
    try {
      const { advanceSourceCursorSafe } = await import(
        "@/lib/news/ingestion/source-state"
      );
      const byKey = new Map<
        string,
        { expected: string | null; newest: string | null; count: number; family: string }
      >();
      for (const a of postEnrich) {
        const key = a.ingestion_source_key?.trim();
        if (!key) continue;
        const family = key.includes(":")
          ? key.split(":")[0]
          : provider;
        const prev = byKey.get(key) ?? {
          expected: a.ingestion_cursor_expected ?? null,
          newest: null as string | null,
          count: 0,
          family,
        };
        prev.count += 1;
        if (
          a.published_at &&
          (!prev.newest || a.published_at > prev.newest)
        ) {
          prev.newest = a.published_at;
        }
        byKey.set(key, prev);
      }
      for (const [sourceKey, info] of byKey) {
        if (!info.newest) continue;
        await advanceSourceCursorSafe({
          sourceKey,
          providerFamily: info.family,
          expectedPrevious: info.expected,
          nextTimestamp: info.newest,
          newItemCount: info.count,
        });
      }
    } catch {
      // Cursor advance is best-effort; never mask persist success.
    }
  }

  const legacyResult = await publishToLegacyArticles(postEnrich);
  result.inserted = legacyResult.inserted;
  result.queuedForAI = legacyResult.queuedForAI;
  result.skippedDuplicates += legacyResult.skippedDuplicates;

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
    earlyDedup: result.earlyDedup,
    imagePageFetches: analytics?.extractedFromPage ?? null,
  });

  return result;
}

export { mergeValidationStats };
