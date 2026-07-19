/**
 * Competitor Intelligence — bounded, resumable crawl orchestrator.
 * One slow domain must not block the entire cron invocation.
 */

import {
  COMPETITOR_BATCH_SIZE,
  COMPETITOR_DOMAIN_TIMEOUT_MS,
  COMPETITOR_MAX_ITEMS_PER_SOURCE,
  COMPETITOR_MAX_PAGE_ENRICHMENTS,
  COMPETITOR_PAGE_TIMEOUT_MS,
  COMPETITOR_RUN_BUDGET_MS,
  COMPETITOR_SOURCE_DELAY_MS,
  isCompetitorTrackerEnabled,
} from "@/lib/competitor-intelligence/config";
import { dedupeParsedArticles } from "@/lib/competitor-intelligence/dedupe";
import {
  errorCompetitorIntel,
  logCompetitorIntel,
  warnCompetitorIntel,
} from "@/lib/competitor-intelligence/logger";
import {
  clearCompetitorProgress,
  loadCompetitorProgress,
  rotateSourcesFromCursor,
  saveCompetitorProgress,
} from "@/lib/competitor-intelligence/progress";
import {
  enrichCompetitorArticleFromHtml,
  parseCompetitorFeed,
} from "@/lib/competitor-intelligence/parser";
import { isUrlAllowedByRobots } from "@/lib/competitor-intelligence/robots";
import {
  createCompetitorRun,
  finishCompetitorRun,
  listEnabledCompetitorSources,
  saveCompetitorArticle,
} from "@/lib/competitor-intelligence/repository";
import {
  hasRunBudget,
  isCompetitorTimeoutError,
  withTimeout,
} from "@/lib/competitor-intelligence/timeouts";
import type {
  CompetitorCrawlResult,
  CompetitorSourceRow,
} from "@/lib/competitor-intelligence/types";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { isSupabaseConfigured } from "@/lib/supabase";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SourceCrawlResult = {
  sourceId: string;
  found: number;
  saved: number;
  duplicates: number;
  errors: string[];
  timedOut: boolean;
  retryable: boolean;
};

async function crawlCompetitorSource(
  source: CompetitorSourceRow,
  runStartedAt: number
): Promise<SourceCrawlResult> {
  const feedUrl = source.feed_url?.trim() || source.homepage;
  const errors: string[] = [];
  let saved = 0;
  let duplicates = 0;
  let timedOut = false;
  let retryable = false;

  const work = async (): Promise<SourceCrawlResult> => {
    if (!hasRunBudget(runStartedAt, COMPETITOR_RUN_BUDGET_MS)) {
      return {
        sourceId: source.id,
        found: 0,
        saved: 0,
        duplicates: 0,
        errors: ["run_budget_exhausted_before_source"],
        timedOut: true,
        retryable: true,
      };
    }

    const allowed = await isUrlAllowedByRobots(feedUrl);
    if (!allowed) {
      warnCompetitorIntel("source_skip", {
        source: source.name,
        reason: "robots_disallow",
        url: feedUrl,
      });
      return {
        sourceId: source.id,
        found: 0,
        saved: 0,
        duplicates: 0,
        errors: ["robots_disallow"],
        timedOut: false,
        retryable: false,
      };
    }

    let parsed;
    try {
      parsed = await parseCompetitorFeed(feedUrl, {
        language: source.language,
        sourceName: source.name,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "feed_parse_failed";
      errorCompetitorIntel("errors", { source: source.name, message });
      return {
        sourceId: source.id,
        found: 0,
        saved: 0,
        duplicates: 0,
        errors: [message],
        timedOut: false,
        retryable: true,
      };
    }

    const limited = dedupeParsedArticles(parsed).slice(
      0,
      COMPETITOR_MAX_ITEMS_PER_SOURCE
    );

    logCompetitorIntel("source_fetch", {
      source: source.name,
      found: limited.length,
      feedUrl,
    });

    for (let i = 0; i < limited.length; i += 1) {
      if (!hasRunBudget(runStartedAt, COMPETITOR_RUN_BUDGET_MS, 3_000)) {
        errors.push("run_budget_exhausted_mid_source");
        retryable = true;
        timedOut = true;
        break;
      }

      let article = limited[i]!;

      if (i < COMPETITOR_MAX_PAGE_ENRICHMENTS) {
        const pageAllowed = await isUrlAllowedByRobots(article.url);
        if (pageAllowed) {
          try {
            article = await withTimeout(
              enrichCompetitorArticleFromHtml(article),
              COMPETITOR_PAGE_TIMEOUT_MS,
              "page",
              article.url
            );
          } catch (err) {
            if (isCompetitorTimeoutError(err)) {
              warnCompetitorIntel("page_timeout", {
                source: source.name,
                url: article.url,
              });
              errors.push(`page_timeout:${article.url}`);
              retryable = true;
            } else {
              const message =
                err instanceof Error ? err.message : "page_enrich_failed";
              errors.push(`${source.name}:${message}`);
            }
          }
          await sleep(300);
        }
      }

      try {
        const result = await saveCompetitorArticle({
          sourceId: source.id,
          article,
        });
        if (result === "duplicate") duplicates += 1;
        else saved += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "article_save_failed";
        errors.push(`${source.name}:${message}`);
        errorCompetitorIntel("errors", {
          source: source.name,
          url: article.url,
          message,
        });
        retryable = true;
      }
    }

    if (saved > 0) {
      logCompetitorIntel("articles_saved", {
        source: source.name,
        saved,
        duplicates,
      });
    }
    if (duplicates > 0) {
      logCompetitorIntel("duplicates", { source: source.name, duplicates });
    }

    return {
      sourceId: source.id,
      found: limited.length,
      saved,
      duplicates,
      errors,
      timedOut,
      retryable,
    };
  };

  try {
    return await withTimeout(
      work(),
      COMPETITOR_DOMAIN_TIMEOUT_MS,
      "domain",
      source.name
    );
  } catch (err) {
    if (isCompetitorTimeoutError(err)) {
      warnCompetitorIntel("domain_timeout", {
        source: source.name,
        timeoutMs: COMPETITOR_DOMAIN_TIMEOUT_MS,
      });
      return {
        sourceId: source.id,
        found: 0,
        saved: 0,
        duplicates: 0,
        errors: [`domain_timeout:${source.name}`],
        timedOut: true,
        retryable: true,
      };
    }
    const message = err instanceof Error ? err.message : "source_failed";
    return {
      sourceId: source.id,
      found: 0,
      saved: 0,
      duplicates: 0,
      errors: [message],
      timedOut: false,
      retryable: true,
    };
  }
}

export async function runCompetitorIntelligenceCrawl(options?: {
  /** Injected for tests */
  now?: () => number;
  heartbeat?: (partial: {
    sourcesCrawled: number;
    articlesSaved: number;
    continued: boolean;
  }) => Promise<void>;
}): Promise<CompetitorCrawlResult> {
  const startedAt = Date.now();
  const now = options?.now ?? Date.now;

  if (!isCompetitorTrackerEnabled()) {
    return {
      ok: true,
      runId: null,
      status: "skipped",
      articlesFound: 0,
      articlesSaved: 0,
      duplicates: 0,
      errors: [],
      durationMs: Date.now() - startedAt,
      sourcesCrawled: 0,
      sourcesAttempted: 0,
      continued: false,
      nextCursorSourceId: null,
      timedOutSources: 0,
      retryableFailures: 0,
      skippedReason: "SEO_COMPETITOR_TRACKER_not_enabled",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      runId: null,
      status: "failed",
      articlesFound: 0,
      articlesSaved: 0,
      duplicates: 0,
      errors: ["supabase_not_configured"],
      durationMs: Date.now() - startedAt,
      sourcesCrawled: 0,
      sourcesAttempted: 0,
      continued: false,
      nextCursorSourceId: null,
      timedOutSources: 0,
      retryableFailures: 0,
    };
  }

  const runId = await createCompetitorRun();
  logCompetitorIntel("crawl_start", { runId });

  // Independent heartbeat so a long crawl still shows as alive.
  await recordCronRun({
    job: "competitor-tracker",
    ok: true,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: 0,
    degraded: true,
    metadata: { phase: "start", runId },
  });

  const allSources = await listEnabledCompetitorSources();
  const progress = await loadCompetitorProgress();
  const rotated = rotateSourcesFromCursor(
    allSources,
    progress?.cursorSourceId ?? null
  );
  const batch = rotated.slice(0, Math.max(1, COMPETITOR_BATCH_SIZE));

  let articlesFound = 0;
  let articlesSaved = 0;
  let duplicates = 0;
  let timedOutSources = 0;
  let retryableFailures = 0;
  const errors: string[] = [];
  let lastCompletedSourceId: string | null = progress?.cursorSourceId ?? null;
  let sourcesCrawled = 0;
  let exhaustedBudget = false;

  for (const source of batch) {
    if (!hasRunBudget(startedAt, COMPETITOR_RUN_BUDGET_MS)) {
      exhaustedBudget = true;
      break;
    }

    const result = await crawlCompetitorSource(source, startedAt);
    sourcesCrawled += 1;
    articlesFound += result.found;
    articlesSaved += result.saved;
    duplicates += result.duplicates;
    errors.push(...result.errors);
    if (result.timedOut) timedOutSources += 1;
    if (result.retryable) retryableFailures += 1;

    // Advance cursor even on timeout so one bad domain cannot pin the batch.
    lastCompletedSourceId = source.id;

    await saveCompetitorProgress({
      cursorSourceId: lastCompletedSourceId,
      updatedAt: new Date(now()).toISOString(),
      lastRunId: runId,
      sourcesCompleted: (progress?.sourcesCompleted ?? 0) + sourcesCrawled,
    });

    if (options?.heartbeat) {
      await options.heartbeat({
        sourcesCrawled,
        articlesSaved,
        continued: true,
      });
    } else {
      await recordCronRun({
        job: "competitor-tracker",
        ok: true,
        startedAt: new Date(startedAt).toISOString(),
        durationMs: Date.now() - startedAt,
        degraded: true,
        entityCount: articlesSaved,
        metadata: {
          phase: "progress",
          runId,
          sourceId: source.id,
          sourcesCrawled,
        },
      });
    }

    await sleep(COMPETITOR_SOURCE_DELAY_MS);
  }

  const totalCompleted =
    (progress?.sourcesCompleted ?? 0) + sourcesCrawled;
  const wrappedFullCycle =
    allSources.length > 0 && totalCompleted >= allSources.length;

  if (wrappedFullCycle && !exhaustedBudget) {
    await clearCompetitorProgress();
    lastCompletedSourceId = null;
  }

  const continued =
    !wrappedFullCycle &&
    (exhaustedBudget ||
      allSources.length > COMPETITOR_BATCH_SIZE ||
      sourcesCrawled < batch.length);

  const hardFailed =
    articlesSaved === 0 &&
    errors.length > 0 &&
    sourcesCrawled > 0 &&
    timedOutSources === sourcesCrawled;

  const status: CompetitorCrawlResult["status"] = hardFailed
    ? "failed"
    : continued && articlesSaved > 0
      ? "completed"
      : errors.length > 0 && articlesSaved === 0
        ? "failed"
        : "completed";

  const partialSuccess =
    !hardFailed && (articlesSaved > 0 || sourcesCrawled > 0) && continued;

  await finishCompetitorRun({
    runId,
    status,
    articlesFound,
    articlesSaved,
    errors,
    metadata: {
      duplicates,
      sourcesCrawled,
      sourcesAttempted: batch.length,
      sourcesTotal: allSources.length,
      durationMs: Date.now() - startedAt,
      continued: continued || partialSuccess,
      nextCursorSourceId: lastCompletedSourceId,
      timedOutSources,
      retryableFailures,
      partialSuccess,
      budgetMs: COMPETITOR_RUN_BUDGET_MS,
      batchSize: COMPETITOR_BATCH_SIZE,
    },
  });

  logCompetitorIntel("crawl_finish", {
    runId,
    status,
    articlesFound,
    articlesSaved,
    duplicates,
    errors: errors.length,
    continued: continued || partialSuccess,
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: status !== "failed",
    runId,
    status,
    articlesFound,
    articlesSaved,
    duplicates,
    errors,
    durationMs: Date.now() - startedAt,
    sourcesCrawled,
    sourcesAttempted: batch.length,
    continued: continued || partialSuccess,
    nextCursorSourceId: lastCompletedSourceId,
    timedOutSources,
    retryableFailures,
    partialSuccess,
  };
}
