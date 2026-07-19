/**
 * Editorial generation lane — SLA targets, queue metrics, incident evaluation.
 */

import { isRegisteredCronJob } from "@/lib/infrastructure/cron/registered-jobs";
import { createAdminClient } from "@/lib/supabase";

export const GENERATION_LANE_TARGETS = {
  /** Max time a job may wait in pending before eligible-enter incident */
  eligibleEnterMs: 15 * 60 * 1000,
  /** Oldest pending job age before backlog incident */
  oldestPendingMaxMs: 30 * 60 * 1000,
  /** No successful run within this window while backlog exists */
  noSuccessMaxMs: 60 * 60 * 1000,
  budgetMs: Number(process.env.EDITORIAL_GENERATE_BUDGET_MS) || 100_000,
  batchLimit: 3,
  lockWindowSec: 840,
} as const;

export type EditorialGenerateLaneOutcome = "success" | "degraded" | "failed";

export type EditorialGenerateQueueMetrics = {
  pending: number;
  claimed: number;
  dead: number;
  oldestPendingAgeMs: number | null;
  lastSuccessAt: string | null;
  lastSuccessAgeMs: number | null;
  recentFailures: number;
};

export type GenerationLaneIncident = {
  code: string;
  severity: "warning" | "critical";
  detail: string;
};

export async function getEditorialGenerateQueueMetrics(): Promise<EditorialGenerateQueueMetrics> {
  const supabase = createAdminClient();
  const now = Date.now();
  const oneHourAgo = new Date(now - 3_600_000).toISOString();

  const [
    pendingRes,
    claimedRes,
    deadRes,
    oldestRes,
    lastSuccessRes,
    recentFailRes,
  ] = await Promise.all([
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("job_type", "editorial_generate")
      .eq("status", "pending"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("job_type", "editorial_generate")
      .eq("status", "claimed"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("job_type", "editorial_generate")
      .eq("status", "dead"),
    supabase
      .from("worker_jobs")
      .select("scheduled_at, created_at")
      .eq("job_type", "editorial_generate")
      .eq("status", "pending")
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("worker_job_runs")
      .select("created_at")
      .eq("job_type", "editorial_generate")
      .eq("ok", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("worker_job_runs")
      .select("id", { count: "exact", head: true })
      .eq("job_type", "editorial_generate")
      .eq("ok", false)
      .gte("created_at", oneHourAgo),
  ]);

  const oldestRow = oldestRes.data;
  const oldestTs = oldestRow?.scheduled_at ?? oldestRow?.created_at ?? null;
  const oldestPendingAgeMs = oldestTs
    ? now - new Date(oldestTs).getTime()
    : null;

  const lastSuccessAt = lastSuccessRes.data?.created_at ?? null;
  const lastSuccessAgeMs = lastSuccessAt
    ? now - new Date(lastSuccessAt).getTime()
    : null;

  return {
    pending: pendingRes.count ?? 0,
    claimed: claimedRes.count ?? 0,
    dead: deadRes.count ?? 0,
    oldestPendingAgeMs,
    lastSuccessAt,
    lastSuccessAgeMs,
    recentFailures: recentFailRes.count ?? 0,
  };
}

export function evaluateGenerationLaneIncidents(
  metrics: EditorialGenerateQueueMetrics,
  options?: { cronRegistered?: boolean }
): GenerationLaneIncident[] {
  const incidents: GenerationLaneIncident[] = [];
  const cronRegistered =
    options?.cronRegistered ?? isRegisteredCronJob("editorial-generate");

  if (!cronRegistered) {
    incidents.push({
      code: "cron_unregistered",
      severity: "critical",
      detail: "editorial-generate is not registered for heartbeat monitoring",
    });
  }

  if (
    metrics.pending > 0 &&
    metrics.oldestPendingAgeMs != null &&
    metrics.oldestPendingAgeMs > GENERATION_LANE_TARGETS.eligibleEnterMs
  ) {
    incidents.push({
      code: "eligible_enter_sla",
      severity: "warning",
      detail: `Oldest editorial_generate job waiting ${Math.round(metrics.oldestPendingAgeMs / 60_000)}m`,
    });
  }

  if (
    metrics.pending > 0 &&
    metrics.oldestPendingAgeMs != null &&
    metrics.oldestPendingAgeMs > GENERATION_LANE_TARGETS.oldestPendingMaxMs
  ) {
    incidents.push({
      code: "queue_age_exceeded",
      severity: "warning",
      detail: `Editorial queue backlog exceeds ${GENERATION_LANE_TARGETS.oldestPendingMaxMs / 60_000}m SLA`,
    });
  }

  if (
    metrics.pending > 0 &&
    metrics.lastSuccessAgeMs != null &&
    metrics.lastSuccessAgeMs > GENERATION_LANE_TARGETS.noSuccessMaxMs
  ) {
    incidents.push({
      code: "no_recent_success",
      severity: "warning",
      detail: "No successful editorial generation within the SLA window",
    });
  }

  if (metrics.lastSuccessAgeMs == null && metrics.pending > 0) {
    incidents.push({
      code: "no_success_record",
      severity: "warning",
      detail: "Editorial generation lane has backlog but no recorded successes",
    });
  }

  if (metrics.dead > 0) {
    incidents.push({
      code: "dead_letters",
      severity: "critical",
      detail: `${metrics.dead} dead editorial_generate job(s) require remediation`,
    });
  }

  return incidents;
}
