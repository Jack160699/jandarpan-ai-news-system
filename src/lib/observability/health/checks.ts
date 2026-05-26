/**
 * Enterprise health checks — Supabase, OpenAI, workers, realtime, storage, vectors, queues, analytics, ingestion
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { getCronMonitorState } from "@/lib/observability/cron-monitor";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { countPendingEditorialImages } from "@/lib/news/ai/generate-editorial-image";
import { getApiProviderHealthDashboard } from "@/lib/infrastructure/providers/api-health";
import { getRssHealthDashboard } from "@/lib/news/rss-health";
import { getProviderRegistryDashboard } from "@/lib/news/providers/circuit-breaker";
import { getAggregationMetrics } from "@/lib/news/live-feed/observability";
import { recordQueueSnapshot } from "@/lib/observability/metrics";
import {
  CORE_ARTICLE_SELECT,
  createAdminServerClient,
  createAnonServerClient,
  getSupabaseEnvDiagnostics,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { HealthCheckResult, HealthStatus } from "@/lib/observability/types";

function statusFrom(ok: boolean, degraded?: boolean): HealthStatus {
  if (ok && !degraded) return "healthy";
  if (ok && degraded) return "degraded";
  if (!ok) return "unhealthy";
  return "unknown";
}

async function timed<T>(
  id: string,
  label: string,
  fn: () => Promise<{ ok: boolean; degraded?: boolean; message?: string; details?: Record<string, unknown> }>
): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      id,
      label,
      status: statusFrom(result.ok, result.degraded),
      latencyMs: Date.now() - start,
      message: result.message,
      details: result.details,
    };
  } catch (err) {
    return {
      id,
      label,
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "check_failed",
    };
  }
}

export async function checkSupabase(): Promise<HealthCheckResult> {
  return timed("supabase", "Supabase", async () => {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: "not_configured" };
    }

    const supabase = createAnonServerClient();
    const { count, error } = await supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .neq("editorial_status", "rejected");

    if (error) return { ok: false, message: error.message, details: { code: error.code } };

    return {
      ok: true,
      details: {
        env: getSupabaseEnvDiagnostics(),
        generatedArticles: count ?? 0,
      },
    };
  });
}

export async function checkOpenAI(): Promise<HealthCheckResult> {
  return timed("openai", "OpenAI", async () => {
    const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
    if (!configured) {
      return { ok: false, degraded: true, message: "OPENAI_API_KEY not set" };
    }
    return { ok: true, details: { configured: true } };
  });
}

export async function checkCronWorkers(): Promise<HealthCheckResult> {
  return timed("cron_workers", "Cron workers", async () => {
    const { jobs, staleJobs } = await getCronMonitorState();
    const ok = staleJobs.length === 0;
    return {
      ok: jobs.length > 0 ? ok : false,
      degraded: staleJobs.length > 0 && jobs.length > 0,
      message: staleJobs.length ? `stale: ${staleJobs.join(", ")}` : undefined,
      details: { recentJobs: jobs.slice(0, 5), staleJobs },
    };
  });
}

export async function checkRealtime(): Promise<HealthCheckResult> {
  return timed("realtime", "Supabase Realtime", async () => {
    if (!isSupabaseConfigured()) return { ok: false, message: "supabase_missing" };
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const realtimeUrl = url ? `${url.replace(/\/$/, "")}/realtime/v1` : null;
    return {
      ok: Boolean(realtimeUrl),
      details: { endpointConfigured: Boolean(realtimeUrl) },
    };
  });
}

export async function checkStorage(): Promise<HealthCheckResult> {
  return timed("storage", "Supabase Storage", async () => {
    if (!isSupabaseConfigured()) return { ok: false, message: "supabase_missing" };

    const supabase = createAdminServerClient();
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      details: { bucketCount: data?.length ?? 0 },
    };
  });
}

export async function checkVectors(): Promise<HealthCheckResult> {
  return timed("vectors", "Intelligence vectors", async () => {
    if (!isSupabaseConfigured()) return { ok: false, message: "supabase_missing" };

    const supabase = createAdminServerClient();
    const { count, error } = await supabase
      .from("intelligence_embeddings")
      .select("id", { count: "exact", head: true });

    if (error) {
      const missing = error.message.includes("does not exist");
      return {
        ok: false,
        degraded: missing,
        message: error.message,
        details: { migration: "028_intelligence_vectors" },
      };
    }

    return {
      ok: true,
      details: { embeddingCount: count ?? 0 },
    };
  });
}

export async function checkQueues(): Promise<HealthCheckResult> {
  return timed("queues", "Processing queues", async () => {
    const [aiPending, editorialImagesPending] = await Promise.all([
      countPendingAiQueue().catch(() => -1),
      countPendingEditorialImages().catch(() => -1),
    ]);

    const snapshot = {
      aiPending: Math.max(0, aiPending),
      editorialImagesPending: Math.max(0, editorialImagesPending),
      ts: new Date().toISOString(),
    };
    await recordQueueSnapshot(snapshot);

    const backlogHigh = aiPending > 500 || editorialImagesPending > 200;

    return {
      ok: aiPending >= 0,
      degraded: backlogHigh,
      message: backlogHigh ? "queue_backlog_elevated" : undefined,
      details: snapshot,
    };
  });
}

export async function checkAnalytics(): Promise<HealthCheckResult> {
  return timed("analytics", "Analytics pipeline", async () => {
    if (!isSupabaseConfigured()) return { ok: false, message: "supabase_missing" };

    const supabase = createAdminServerClient();
    const { error } = await supabase
      .from("newsroom_analytics_events")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      return {
        ok: false,
        degraded: true,
        message: error.message,
      };
    }

    return { ok: true };
  });
}

export async function checkIngestion(): Promise<HealthCheckResult> {
  return timed("ingestion", "Ingestion pipeline", async () => {
    if (!isSupabaseConfigured()) return { ok: false, message: "supabase_missing" };

    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from("ingestion_logs")
      .select("id,status,inserted,total_fetched,created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false, message: error.message };

    const [apiHealth, rssHealth] = await Promise.all([
      getApiProviderHealthDashboard().catch(() => []),
      getRssHealthDashboard().catch(() => []),
    ]);

    const rssHealthy = rssHealth.filter((s) => s.healthy).length;
    const lastOk = data?.status !== "error" && data?.status !== "failed";

    return {
      ok: Boolean(data) && lastOk,
      degraded: !lastOk || rssHealthy < Math.ceil(rssHealth.length * 0.5),
      details: {
        lastRun: data,
        apiProviders: apiHealth.length,
        rssHealthy,
        rssTotal: rssHealth.length,
        liveFeed: getAggregationMetrics(),
        circuitBreaker: await getProviderRegistryDashboard().catch(() => []),
      },
    };
  });
}

export async function checkRedisCache(): Promise<HealthCheckResult> {
  return timed("redis", "Upstash Redis", async () => {
    const configured = isRedisConfigured();
    return {
      ok: configured || process.env.NODE_ENV !== "production",
      degraded: !configured,
      message: configured ? undefined : "redis_not_configured",
      details: {
        enabled: INFRA_CONFIG.redisEnabled,
        homepageCacheSeconds: INFRA_CONFIG.homepageCacheSeconds,
      },
    };
  });
}

export async function checkHomepageReadable(): Promise<HealthCheckResult> {
  return timed("homepage", "Homepage content pool", async () => {
    if (!isSupabaseConfigured()) return { ok: false, message: "supabase_missing" };

    const supabase = createAnonServerClient();
    const { data, error } = await supabase
      .from("generated_articles")
      .select(CORE_ARTICLE_SELECT)
      .neq("editorial_status", "rejected")
      .neq("editorial_status", "pending")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(3);

    if (error) return { ok: false, message: error.message };

    return {
      ok: (data?.length ?? 0) > 0,
      degraded: (data?.length ?? 0) === 0,
      details: { sampleSize: data?.length ?? 0 },
    };
  });
}

export async function runAllHealthChecks(): Promise<HealthCheckResult[]> {
  return Promise.all([
    checkSupabase(),
    checkOpenAI(),
    checkCronWorkers(),
    checkRealtime(),
    checkStorage(),
    checkVectors(),
    checkQueues(),
    checkAnalytics(),
    checkIngestion(),
    checkRedisCache(),
    checkHomepageReadable(),
  ]);
}

export function aggregateHealthStatus(
  checks: HealthCheckResult[]
): HealthStatus {
  if (checks.some((c) => c.status === "unhealthy")) return "unhealthy";
  if (checks.some((c) => c.status === "degraded")) return "degraded";
  if (checks.every((c) => c.status === "healthy")) return "healthy";
  return "unknown";
}
