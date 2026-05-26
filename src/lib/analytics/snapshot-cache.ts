/**
 * Precomputed enterprise analytics snapshots
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { WORKER_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
import type { EnterpriseAnalyticsReport } from "@/lib/analytics/types";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

const STALE_MS = Number(process.env.ANALYTICS_STALE_MS) || 10 * 60 * 1000;

export async function getCachedAnalyticsReport(
  tenantId: string,
  windowHours: number
): Promise<EnterpriseAnalyticsReport | null> {
  const redisHit = await cacheGetJson<EnterpriseAnalyticsReport>(
    WORKER_CACHE_KEYS.analytics(tenantId, windowHours)
  );
  if (redisHit) return redisHit;

  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("analytics_snapshots")
    .select("snapshot, built_at")
    .eq("tenant_id", tenantId)
    .eq("window_hours", windowHours)
    .maybeSingle();

  if (!data?.snapshot) return null;

  const ageMs = Date.now() - new Date(data.built_at as string).getTime();
  if (ageMs > STALE_MS) return null;

  const report = data.snapshot as EnterpriseAnalyticsReport;
  await cacheSetJson(
    WORKER_CACHE_KEYS.analytics(tenantId, windowHours),
    report,
    300
  );
  return report;
}

export async function requestAnalyticsRefresh(
  tenantId: string,
  windowHours = 168
): Promise<void> {
  const { enqueueJob } = await import("@/lib/infrastructure/jobs/queue");
  await enqueueJob({
    jobType: "analytics_aggregate",
    dedupeKey: `analytics:${tenantId}:${windowHours}`,
    tenantId,
    payload: { windowHours },
    priority: 2,
  });
}
