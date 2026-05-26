/**
 * Production stability score — weighted health factors
 */

import type { HealthCheckResult, StabilityScore } from "@/lib/observability/types";
import { summarizeApiLatency } from "@/lib/observability/metrics";
import type { ApiMetricSample } from "@/lib/observability/types";
import { getOpsErrorSummary } from "@/lib/observability/errors";
import { getCronMonitorState } from "@/lib/observability/cron-monitor";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { getProductionEnvChecks } from "@/lib/infrastructure/production";
import { isSentryEnabled } from "@/lib/observability/sentry";

function checkScore(status: HealthCheckResult["status"]): number {
  if (status === "healthy") return 100;
  if (status === "degraded") return 60;
  if (status === "unknown") return 40;
  return 0;
}

export async function computeStabilityScore(input: {
  checks: HealthCheckResult[];
  apiSamples?: ApiMetricSample[];
}): Promise<StabilityScore> {
  const factors: StabilityScore["factors"] = [];

  const criticalIds = [
    "supabase",
    "ingestion",
    "homepage",
    "queues",
    "cron_workers",
  ];
  const criticalChecks = input.checks.filter((c) =>
    criticalIds.includes(c.id)
  );
  const criticalAvg =
    criticalChecks.reduce((s, c) => s + checkScore(c.status), 0) /
    Math.max(1, criticalChecks.length);
  factors.push({
    name: "Core platform health",
    weight: 0.35,
    score: criticalAvg,
  });

  const env = getProductionEnvChecks();
  factors.push({
    name: "Production env readiness",
    weight: 0.15,
    score: env.ready ? 100 : 40,
    note: env.warnings.slice(0, 2).join("; ") || undefined,
  });

  const errors = await getOpsErrorSummary();
  const errorScore = Math.max(0, 100 - errors.last24h * 8 - errors.bySeverity.critical * 20);
  factors.push({
    name: "Error rate (24h)",
    weight: 0.15,
    score: errorScore,
    note: `${errors.last24h} errors in 24h`,
  });

  const cron = await getCronMonitorState();
  const cronScore =
    cron.staleJobs.length === 0
      ? 100
      : Math.max(0, 100 - cron.staleJobs.length * 25);
  factors.push({
    name: "Cron freshness",
    weight: 0.15,
    score: cronScore,
    note: cron.staleJobs.length ? `Stale: ${cron.staleJobs.join(", ")}` : undefined,
  });

  const apiSummary = summarizeApiLatency(input.apiSamples ?? []);
  const latencyScore =
    apiSummary.count === 0
      ? 80
      : Math.max(0, 100 - apiSummary.p95 / 30 - apiSummary.errorRate * 100);
  factors.push({
    name: "API latency & errors",
    weight: 0.1,
    score: latencyScore,
    note: apiSummary.count ? `p95 ${apiSummary.p50}ms` : "no samples yet",
  });

  const infraScore =
    (isRedisConfigured() ? 50 : 20) + (isSentryEnabled() ? 50 : 30);
  factors.push({
    name: "Observability stack",
    weight: 0.1,
    score: infraScore,
    note: `Redis ${isRedisConfigured() ? "on" : "off"}, Sentry ${isSentryEnabled() ? "on" : "off"}`,
  });

  const score = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  let grade: StabilityScore["grade"] = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 55) grade = "D";

  return { score, grade, factors };
}
