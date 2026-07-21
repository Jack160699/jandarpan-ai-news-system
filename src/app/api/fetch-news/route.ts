/**
 * App Router API: GET/POST /api/fetch-news
 *
 * Scalable ingestion — parallel providers, incremental upserts, async AI queue.
 * Primary trigger: Upstash QStash (every 30m). Vercel cron is daily backup only.
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
import { runScalableIngestion } from "@/lib/news/pipeline/scalable-ingest";
import {
  classifyIngestionOutcome,
  describeIngestionOutcome,
  type IngestionOutcome,
} from "@/lib/news/pipeline/ingestion-outcome";
import { runWorkerEndpoint } from "@/lib/infrastructure/workers/run-guard";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { isSupabaseConfigured } from "@/lib/supabase";
import { pipelineLog } from "@/lib/observability/production-log";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { trackOpsError } from "@/lib/observability/errors";
import { buildQueueHealthSnapshot } from "@/lib/infrastructure/queue/health-manager";
import { asJsonObject } from "@/types/json";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  return handleFetchNews(request);
}

export async function POST(request: Request) {
  return handleFetchNews(request);
}

function resolveSchedulerIdentity(auth: {
  vercelCron: boolean;
  qstashVerified?: boolean;
}): "vercel_cron" | "qstash" | "bearer_unknown" {
  if (auth.vercelCron) return "vercel_cron";
  if (auth.qstashVerified) return "qstash";
  return "bearer_unknown";
}

function extractGnewsMode(errors: string[]): string | null {
  const hit = errors.find((e) => /gnews_mode:/i.test(e));
  if (!hit) return null;
  const m = hit.match(/gnews_mode:([^\s,]+)/i);
  return m?.[1] ?? null;
}

function buildIngestTelemetry(input: {
  runId: string;
  schedulerIdentity: string;
  result: Awaited<ReturnType<typeof runScalableIngestion>>;
  outcome: IngestionOutcome;
}): Record<string, unknown> {
  const { runId, schedulerIdentity, result, outcome } = input;
  return {
    runId,
    schedulerIdentity,
    fetched: result.totalFetched,
    normalized: result.normalized,
    inserted: result.inserted,
    signalsInserted: result.signalsInserted,
    duplicates: result.skippedDuplicates,
    failedBatches: result.failedBatches,
    persistenceErrors: result.persistenceErrors.slice(0, 8).map((e) => e.slice(0, 240)),
    attemptedInserts: result.attemptedInserts,
    allBatchesFailed: result.allBatchesFailed,
    partialPersistence: result.partialPersistence,
    persistenceFailed: result.persistenceFailed,
    classification: outcome.classification,
    status: outcome.status,
    gnewsMode: extractGnewsMode(result.errors),
    providerCounts: result.providerStats,
    completedProviders: result.completedProviders,
    skippedProviders: result.skippedProviders,
  };
}

async function handleFetchNews(request: Request) {
  const startedAt = Date.now();
  const deadline = createExecutionDeadline();
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";
  const runId = crypto.randomUUID();

  const auth = await verifyCronRequest(request, { capability: "ingest" });
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

  const schedulerIdentity = resolveSchedulerIdentity(auth);

  pipelineLog("[cron_triggered]", {
    job: "fetch-news",
    path: new URL(request.url).pathname,
    ts: new Date().toISOString(),
    runId,
    schedulerIdentity,
  });

  if (!isSupabaseConfigured()) {
    logIngestFailure({ reason: "supabase_not_configured", durationMs: 0 });
    const outcome = classifyIngestionOutcome({
      fetched: 0,
      inserted: 0,
      duplicates: 0,
      rejected: 0,
      queuedForAI: 0,
      completedProviders: [],
      skippedProviders: [],
      errors: ["supabase_not_configured"],
      timedOutSafely: false,
      persistenceSucceeded: false,
      configurationFailed: true,
      startedAt,
      completedAt: Date.now(),
    });
    await recordCronRun({
      job: "fetch-news",
      ok: false,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      error: "supabase_not_configured",
      metadata: {
        runId,
        schedulerIdentity,
        classification: outcome.classification,
      },
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase is not configured",
        classification: outcome.classification,
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  if (!hasAnyNewsProviderConfigured()) {
    logIngestFailure({ reason: "no_providers_configured", durationMs: 0 });
    const outcome = classifyIngestionOutcome({
      fetched: 0,
      inserted: 0,
      duplicates: 0,
      rejected: 0,
      queuedForAI: 0,
      completedProviders: [],
      skippedProviders: [],
      errors: ["no_providers_configured"],
      timedOutSafely: false,
      persistenceSucceeded: true,
      configurationFailed: true,
      startedAt,
      completedAt: Date.now(),
    });
    await recordCronRun({
      job: "fetch-news",
      ok: false,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      error: "no_providers_configured",
      metadata: {
        runId,
        schedulerIdentity,
        classification: outcome.classification,
      },
    });
    return NextResponse.json(
      {
        ok: false,
        error: "No news providers configured (GNEWS_API_KEY or NEWSDATA_API_KEY)",
        classification: outcome.classification,
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  logIngestStart({
    trigger: auth.vercelCron
      ? "vercel_cron"
      : auth.qstashVerified
        ? "qstash"
        : "bearer",
    userAgent,
  });

  const lockResult = await runWorkerEndpoint("fetch-news", 1700, async () => {
    const health = await buildQueueHealthSnapshot().catch(() => null);
    if (health?.pauseIngestion) {
      const outcome = classifyIngestionOutcome({
        fetched: 0,
        inserted: 0,
        duplicates: 0,
        rejected: 0,
        queuedForAI: 0,
        completedProviders: [],
        skippedProviders: [],
        errors: [],
        timedOutSafely: false,
        persistenceSucceeded: true,
        skippedBackpressure: true,
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
      return {
        ok: true,
        degraded: true,
        processed: 0,
        failed: 0,
        details: {
          skipped: true,
          reason: "queue_backpressure",
          queueHealth: health,
          outcome,
        },
      };
    }

    logIngestionAnalytics({ event: "worker_start", worker: "ingest" });

    const workerStartedAt = Date.now();
    const result = await runScalableIngestion(deadline);
    const providerCount = result.completedProviders.length;
    const quota = detectQuotaStatus(result.errors);

    if (result.inserted > 0 && !result.persistenceFailed) {
      await revalidateNewsroomCaches();
    }

    // Canonical ingestion outcome — persistenceSucceeded MUST reflect real persist.
    const persistenceSucceeded = !(
      result.allBatchesFailed || result.persistenceFailed
    );
    const outcome = classifyIngestionOutcome({
      fetched: result.totalFetched,
      inserted: result.inserted,
      signalsInserted: result.signalsInserted,
      duplicates: result.skippedDuplicates,
      rejected: result.failedValidation,
      queuedForAI: result.queuedForAI,
      completedProviders: result.completedProviders,
      skippedProviders: result.skippedProviders,
      errors: result.errors,
      timedOutSafely: result.timedOutSafely,
      persistenceSucceeded,
      startedAt: workerStartedAt,
      completedAt: Date.now(),
    });

    return {
      ok: outcome.status !== "failed",
      degraded: outcome.degraded,
      processed: result.inserted + result.signalsInserted,
      // Only a genuine failure counts against the worker; soft errors do not.
      failed: outcome.status === "failed" ? 1 : 0,
      details: { result, providerCount, quota, outcome },
    };
  });

  if (lockResult.skipped && lockResult.reason === "overlap_lock") {
    await recordCronRun({
      job: "fetch-news",
      ok: true,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      degraded: true,
      metadata: { runId, schedulerIdentity, reason: "overlap_lock" },
    });
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: "overlap_lock",
        durationMs: Date.now() - startedAt,
        runId,
      },
      { headers: noStoreHeaders() }
    );
  }

  // Ingestion intentionally skipped this cycle (queue backpressure). This is a
  // healthy protective skip, not a failure.
  if (lockResult.details?.skipped) {
    const outcome = lockResult.details.outcome as IngestionOutcome | undefined;
    await recordCronRun({
      job: "fetch-news",
      ok: true,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      degraded: true,
      metadata: {
        runId,
        schedulerIdentity,
        reason: String(lockResult.details.reason ?? "skipped"),
        classification: outcome?.classification ?? "skipped_backpressure",
      },
    });
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: String(lockResult.details.reason ?? "skipped"),
        classification: outcome?.classification ?? "skipped_backpressure",
        durationMs: Date.now() - startedAt,
        runId,
      },
      { headers: noStoreHeaders() }
    );
  }

  // No result object means the worker threw before producing an outcome — a
  // genuine infrastructure failure.
  if (!lockResult.details?.result || !lockResult.details?.outcome) {
    const message = lockResult.reason ?? "ingest_worker_failed";
    await recordCronRun({
      job: "fetch-news",
      ok: false,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      error: message,
      metadata: { runId, schedulerIdentity },
    });
    return NextResponse.json(
      { ok: false, error: message, durationMs: Date.now() - startedAt, runId },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  try {
    const result = lockResult.details.result as Awaited<
      ReturnType<typeof runScalableIngestion>
    >;
    const providerCount = lockResult.details.providerCount as number;
    const quota = lockResult.details.quota as ReturnType<typeof detectQuotaStatus>;
    const outcome = lockResult.details.outcome as IngestionOutcome;
    const durationMs = Date.now() - startedAt;
    const incident = describeIngestionOutcome(outcome);
    const telemetry = buildIngestTelemetry({
      runId,
      schedulerIdentity,
      result,
      outcome,
    });

    // ---- GENUINE FAILURE: every source family failed / persistence failed ----
    if (outcome.status === "failed") {
      logIngestFailure({
        articleCount: 0,
        providerCount,
        latencyMs: durationMs,
        rateLimited: quota.rateLimited,
        quotaHints: quota.quotaHints,
        skippedProviders: result.skippedProviders,
        errors: result.errors.slice(0, 8),
        preservedExistingDb: true,
      });

      const telemetryJson = asJsonObject(telemetry);
      await recordCronRun({
        job: "fetch-news",
        ok: false,
        startedAt: new Date(startedAt).toISOString(),
        durationMs,
        error: outcome.failureReason ?? "ingestion_failed",
        metadata: telemetry,
        workers: [
          {
            worker: "ingest",
            ok: false,
            durationMs,
            skipped: false,
            metadata: telemetryJson,
          },
        ],
      });

      const httpStatus =
        outcome.classification === "failed_persistence" ? 500 : 502;

      return NextResponse.json(
        {
          ok: false,
          status: outcome.status,
          classification: outcome.classification,
          error: incident.title,
          detail: incident.detail,
          failureReason: outcome.failureReason,
          preservedExistingDb: true,
          completedProviders: result.completedProviders,
          skippedProviders: result.skippedProviders,
          requiredProviderFailures: outcome.requiredProviderFailures,
          validationStats: result.validationStats,
          errors: result.errors,
          failedBatches: result.failedBatches,
          persistenceErrors: result.persistenceErrors.slice(0, 8),
          durationMs,
          timedOutSafely: result.timedOutSafely,
          rateLimited: quota.rateLimited,
          runId,
        },
        { status: httpStatus, headers: noStoreHeaders() }
      );
    }

    const payload = {
      ok: true as const,
      status: outcome.status,
      classification: outcome.classification,
      degraded: outcome.degraded,
      incident: outcome.degraded ? incident : undefined,
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
      attemptedInserts: result.attemptedInserts,
      failedBatches: result.failedBatches,
      partialPersistence: result.partialPersistence,
      runId,
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

    await recordCronRun({
      job: "fetch-news",
      ok: true,
      startedAt: new Date(startedAt).toISOString(),
      durationMs,
      degraded: payload.degraded,
      metadata: telemetry,
      workers: [
        {
          worker: "ingest",
          ok: true,
          durationMs,
          skipped: false,
          metadata: asJsonObject(telemetry),
        },
      ],
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
      metadata: { runId, schedulerIdentity },
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
        runId,
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

