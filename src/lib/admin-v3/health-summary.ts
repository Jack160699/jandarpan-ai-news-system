/**
 * Fast platform health summary — count/heartbeat style probes only.
 * Heavy diagnostics stay on /api/admin/ops/health.
 */

import {
  aggregateHealthStatus,
  getCronMonitorState,
  getMetricsDashboard,
  type HealthCheckResult,
} from "@/lib/observability";
import {
  checkCronWorkers,
  checkOpenAI,
  checkQueues,
  checkRedisCache,
  checkSupabase,
} from "@/lib/observability/health/checks";
import { deriveCanonicalHealth } from "@/lib/admin-v3/canonical-health";

export type TimedSourceResult<T = unknown> = {
  source: string;
  ok: boolean;
  ms: number;
  error?: string;
  data?: T;
};

const SOURCE_BUDGET_MS = 1_200;

async function timedSource<T>(
  source: string,
  fn: () => Promise<T>,
  budgetMs = SOURCE_BUDGET_MS
): Promise<TimedSourceResult<T>> {
  const started = Date.now();
  try {
    const data = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        windowSetTimeoutFake(reject, budgetMs, source);
      }),
    ]);
    return { source, ok: true, ms: Date.now() - started, data };
  } catch (err) {
    return {
      source,
      ok: false,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function windowSetTimeoutFake(
  reject: (reason?: unknown) => void,
  budgetMs: number,
  source: string
) {
  setTimeout(() => reject(new Error(`${source}_timeout_${budgetMs}ms`)), budgetMs);
}

export async function buildHealthSummary() {
  const wallStart = Date.now();

  const [
    supabaseR,
    openaiR,
    cronWorkersR,
    queuesR,
    redisR,
    cronStateR,
    metricsR,
  ] = await Promise.all([
    timedSource("supabase", () => checkSupabase()),
    timedSource("openai", () => checkOpenAI()),
    timedSource("cron_workers", () => checkCronWorkers()),
    timedSource("queues", () => checkQueues()),
    timedSource("redis", () => checkRedisCache()),
    timedSource("cron_state", () => getCronMonitorState()),
    timedSource("metrics", () => getMetricsDashboard()),
  ]);

  const checks: HealthCheckResult[] = [];
  for (const r of [supabaseR, openaiR, cronWorkersR, queuesR, redisR]) {
    if (r.ok && r.data) checks.push(r.data as HealthCheckResult);
    else {
      checks.push({
        id: r.source,
        label: r.source.replace(/_/g, " "),
        status: "unknown",
        latencyMs: r.ms,
        message: r.error ?? "unavailable",
      });
    }
  }

  const status = aggregateHealthStatus(checks);
  const cron = cronStateR.ok ? cronStateR.data : { jobs: [], staleJobs: [] as string[] };
  const metrics = metricsR.ok
    ? metricsR.data
    : {
        memoryUsageMb: 0,
        uptimeSec: 0,
        queues: null,
        api: [],
      };

  const snapshot = deriveCanonicalHealth({
    ok: status !== "unhealthy",
    status,
    stability: {
      score:
        status === "healthy" ? 88 : status === "degraded" ? 62 : status === "unhealthy" ? 28 : 50,
      grade:
        status === "healthy" ? "B" : status === "degraded" ? "C" : status === "unhealthy" ? "F" : "D",
      factors: [],
    },
    checks,
    cron,
    launchWidgets: [],
    timestamp: new Date().toISOString(),
  });

  const sources = [
    supabaseR,
    openaiR,
    cronWorkersR,
    queuesR,
    redisR,
    cronStateR,
    metricsR,
  ].map(({ source, ok, ms, error }) => ({ source, ok, ms, error }));

  const failedSources = sources.filter((s) => !s.ok);

  return {
    ok: true,
    mode: "summary" as const,
    status,
    snapshot,
    checks: checks.map((c) => ({
      id: c.id,
      label: c.label,
      status: c.status,
      latencyMs: c.latencyMs,
      message: c.message,
    })),
    metrics: {
      memoryUsageMb: (metrics as { memoryUsageMb?: number })?.memoryUsageMb ?? 0,
      uptimeSec: (metrics as { uptimeSec?: number })?.uptimeSec ?? 0,
      queues: (metrics as { queues?: unknown })?.queues ?? null,
    },
    cron,
    sources,
    failedSources,
    totalMs: Date.now() - wallStart,
    checkedAt: new Date().toISOString(),
    stale: failedSources.length > 0,
  };
}
