/**
 * App Router API: GET/POST /api/fetch-news
 *
 * Scalable ingestion — parallel providers, incremental upserts, async AI queue.
 * Primary trigger: GitHub Actions (every 30m). Vercel cron is daily backup only.
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { hasAnyNewsProviderConfigured } from "@/lib/news/env";
import {
  detectQuotaStatus,
  logIngestAuthDenied,
  logIngestDegraded,
  logIngestFailure,
  logIngestStart,
  logIngestSuccess,
} from "@/lib/news/pipeline/ingest-logger";
import {
  runScalableIngestion,
  triggerAiProcessing,
} from "@/lib/news/pipeline/scalable-ingest";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { isSupabaseConfigured } from "@/lib/supabase";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { trackOpsError } from "@/lib/observability/errors";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  return handleFetchNews(request);
}

export async function POST(request: Request) {
  return handleFetchNews(request);
}

async function handleFetchNews(request: Request) {
  const startedAt = Date.now();
  const deadline = createExecutionDeadline();
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";

  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    logIngestAuthDenied({
      bearerReceived: !!auth.bearerToken,
      xCronReceived: !!auth.cronHeader,
      vercelCron: auth.vercelCron,
      userAgent,
      path: new URL(request.url).pathname,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
        hint: "Use Authorization: Bearer <CRON_SECRET>",
      },
      { status: 401, headers: noStoreHeaders() }
    );
  }
  console.log(
    JSON.stringify({
      tag: "[cron_triggered]",
      job: "fetch-news",
      path: new URL(request.url).pathname,
      ts: new Date().toISOString(),
    })
  );

  if (!isSupabaseConfigured()) {
    logIngestFailure({ reason: "supabase_not_configured", durationMs: 0 });
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  if (!hasAnyNewsProviderConfigured()) {
    logIngestFailure({ reason: "no_providers_configured", durationMs: 0 });
    return NextResponse.json(
      {
        ok: false,
        error: "No news providers configured (GNEWS_API_KEY or NEWSDATA_API_KEY)",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  logIngestStart({
    trigger: auth.vercelCron ? "vercel_cron" : "bearer",
    userAgent,
  });

  try {
    logIngestionAnalytics({ event: "worker_start", worker: "ingest" });

    const result = await runScalableIngestion(deadline);
    const durationMs = Date.now() - startedAt;
    const providerCount = result.completedProviders.length;
    const quota = detectQuotaStatus(result.errors);

    if (result.inserted > 0) {
      await revalidateNewsroomCaches();
    }

    triggerAiProcessing(request.url);

    const { refreshSnapshotFromDatabase } = await import(
      "@/lib/news/live-feed/resolve-pool"
    );
    if (result.inserted > 0 || result.signalsInserted > 0) {
      await refreshSnapshotFromDatabase(120).catch(() => null);
    }

    const hasPartialSuccess =
      result.inserted > 0 ||
      result.signalsInserted > 0 ||
      (result.totalFetched > 0 && providerCount > 0);

    const allProvidersFailed =
      result.totalFetched === 0 &&
      result.inserted === 0 &&
      providerCount === 0;

    if (allProvidersFailed) {
      logIngestFailure({
        articleCount: 0,
        providerCount: 0,
        latencyMs: durationMs,
        rateLimited: quota.rateLimited,
        quotaHints: quota.quotaHints,
        skippedProviders: result.skippedProviders,
        errors: result.errors.slice(0, 8),
        preservedExistingDb: true,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "No articles fetched from providers",
          preservedExistingDb: true,
          completedProviders: result.completedProviders,
          skippedProviders: result.skippedProviders,
          validationStats: result.validationStats,
          errors: result.errors,
          durationMs,
          timedOutSafely: result.timedOutSafely,
          rateLimited: quota.rateLimited,
        },
        { status: 502, headers: noStoreHeaders() }
      );
    }

    const payload = {
      ok: true as const,
      degraded: result.errors.length > 0 || result.skippedProviders.length > 0,
      inserted: result.inserted,
      signalsInserted: result.signalsInserted,
      skippedDuplicates: result.skippedDuplicates,
      failedValidation: result.failedValidation,
      validationStats: result.validationStats,
      normalized: result.normalized,
      totalFetched: result.totalFetched,
      queuedForAI: result.queuedForAI,
      completedProviders: result.completedProviders,
      skippedProviders: result.skippedProviders,
      providerCount,
      timedOutSafely: result.timedOutSafely,
      categoryStats: result.categoryStats,
      providerStats: result.providerStats,
      errors: result.errors,
      failures: result.failures,
      logId: result.logId,
      durationMs,
      rateLimited: quota.rateLimited,
      quotaHints: quota.quotaHints,
      rssSourceAnalytics: result.rssSourceAnalytics,
      healthySources: result.healthySources,
      failedSources: result.failedSources,
      articlesRecoveredByFallback: result.articlesRecoveredByFallback,
      imageAnalytics: result.imageAnalytics,
      cacheRevalidated: result.inserted > 0,
      scalable: true,
    };

    if (payload.degraded) {
      logIngestDegraded({
        articleCount: result.inserted,
        signalsInserted: result.signalsInserted,
        totalFetched: result.totalFetched,
        providerCount,
        latencyMs: durationMs,
        rateLimited: quota.rateLimited,
        skippedProviders: result.skippedProviders,
        errors: result.errors.slice(0, 5),
      });
    } else {
      logIngestSuccess({
        articleCount: result.inserted,
        signalsInserted: result.signalsInserted,
        totalFetched: result.totalFetched,
        providerCount,
        latencyMs: durationMs,
        rateLimited: quota.rateLimited,
        queuedForAI: result.queuedForAI,
      });
    }

    if (!hasPartialSuccess) {
      logIngestFailure({
        reason: "no_inserts_after_fetch",
        totalFetched: result.totalFetched,
        providerCount,
        latencyMs: durationMs,
        preservedExistingDb: true,
      });
    }

    await recordCronRun({
      job: "fetch-news",
      ok: payload.ok,
      startedAt: new Date(startedAt).toISOString(),
      durationMs,
      degraded: payload.degraded,
    });

    return NextResponse.json(payload, { headers: noStoreHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const durationMs = Date.now() - startedAt;
    await trackOpsError({
      source: "fetch-news",
      message,
      severity: "critical",
      err,
    });
    await recordCronRun({
      job: "fetch-news",
      ok: false,
      startedAt: new Date(startedAt).toISOString(),
      durationMs,
      error: message,
    });
    logIngestFailure({
      reason: "fatal",
      error: message,
      latencyMs: durationMs,
      preservedExistingDb: true,
    });
    return NextResponse.json(
      {
        ok: false,
        error: message,
        durationMs,
        timedOutSafely: deadline.timedOutSafely,
        preservedExistingDb: true,
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}
