/**
 * Canonical production health aggregation for Admin V3.
 * Header, Command Centre, bell, and Platform Health must share this model.
 */

export type CanonicalHealthState =
  | "healthy"
  | "warning"
  | "degraded"
  | "critical"
  | "unknown";

export type CanonicalHealthReason = {
  id: string;
  severity: CanonicalHealthState;
  title: string;
  detail: string;
  href: string;
  /** Normalized incident family for deduplication across sources. */
  incidentFamily?: string;
};

export type CanonicalHealthSnapshot = {
  state: CanonicalHealthState;
  label: string;
  reasons: CanonicalHealthReason[];
  checkedAt: string;
  score?: number;
  grade?: string;
  criticalCount?: number;
  warningCount?: number;
  topIncidents?: CanonicalHealthReason[];
};

const STATE_RANK: Record<CanonicalHealthState, number> = {
  healthy: 0,
  unknown: 1,
  warning: 2,
  degraded: 3,
  critical: 4,
};

const CRON_EXECUTION_FAMILY = "cron-execution";

function worse(
  a: CanonicalHealthState,
  b: CanonicalHealthState
): CanonicalHealthState {
  return STATE_RANK[b] > STATE_RANK[a] ? b : a;
}

function mapCheckStatus(status: string): CanonicalHealthState {
  if (status === "healthy" || status === "ok") return "healthy";
  if (status === "degraded") return "degraded";
  if (status === "unhealthy" || status === "critical" || status === "failed") {
    return "critical";
  }
  if (status === "warning") return "warning";
  return "unknown";
}

const OPTIONAL_CHECK_IDS = new Set([
  "openai",
  "redis",
  "redis_cache",
  "ai providers",
  "upstash redis",
]);

function isOptionalUnconfiguredCheck(c: Record<string, unknown>): boolean {
  const id = String(c.id ?? "").toLowerCase();
  const label = String(c.label ?? "").toLowerCase();
  const message = String(c.message ?? "").toLowerCase();
  const optionalId =
    OPTIONAL_CHECK_IDS.has(id) ||
    label.includes("redis") ||
    label.includes("ai provider") ||
    id === "openai";
  if (!optionalId) return false;
  return (
    message.includes("not_configured") ||
    message.includes("redis_not_configured") ||
    message.includes("no ai providers") ||
    message.includes("no cloud ai") ||
    message.includes("local enrich only")
  );
}

function isProbeTimeoutCheck(c: Record<string, unknown>): boolean {
  const message = String(c.message ?? "").toLowerCase();
  const status = String(c.status ?? "").toLowerCase();
  return (
    message.includes("timeout") ||
    (status === "unknown" && message.includes("unavailable"))
  );
}

function estimateScoreFromState(state: CanonicalHealthState): {
  score: number;
  grade: string;
} {
  switch (state) {
    case "healthy":
      return { score: 92, grade: "A" };
    case "warning":
      return { score: 78, grade: "B" };
    case "degraded":
      return { score: 62, grade: "C" };
    case "critical":
      return { score: 28, grade: "F" };
    default:
      return { score: 50, grade: "D" };
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function isCronHealthCheck(c: Record<string, unknown>): boolean {
  const id = String(c.id ?? "").toLowerCase();
  const label = String(c.label ?? "").toLowerCase();
  return id === "cron_workers" || label.includes("cron worker");
}

function isCronLaunchWidget(w: Record<string, unknown>): boolean {
  const id = String(w.id ?? "").toLowerCase();
  const label = String(w.label ?? "").toLowerCase();
  return id === "cron" || label.includes("cron health");
}

function incidentFamilyForReason(reason: CanonicalHealthReason): string {
  if (reason.incidentFamily) return reason.incidentFamily;
  if (reason.id === "incident-cron-execution") return CRON_EXECUTION_FAMILY;
  if (reason.id.startsWith("cron-fail-")) return CRON_EXECUTION_FAMILY;
  if (reason.id.startsWith("worker-") || reason.id.includes("heartbeat")) {
    return "worker-execution";
  }
  const hay = `${reason.id} ${reason.title} ${reason.detail}`.toLowerCase();
  if (hay.includes("gnews") && (hay.includes("429") || hay.includes("rate"))) {
    return "provider-quota:gnews";
  }
  if (hay.includes("429") || hay.includes("rate limit") || hay.includes("quota")) {
    return "provider-quota";
  }
  if (hay.includes("translation") && hay.includes("backlog")) {
    return "translation-backlog";
  }
  if (hay.includes("timeout") && (hay.includes("database") || hay.includes("supabase") || hay.includes("query"))) {
    return "database-performance";
  }
  if (reason.id.startsWith("check-")) return `check:${reason.id.slice("check-".length)}`;
  if (reason.id.startsWith("launch-")) return `launch:${reason.id.slice("launch-".length)}`;
  if (reason.id.startsWith("err-")) return `ops-error-family`;
  return reason.id;
}

function dedupeByIncidentFamily(
  reasons: CanonicalHealthReason[]
): CanonicalHealthReason[] {
  const byFamily = new Map<string, CanonicalHealthReason>();

  for (const reason of reasons) {
    const family = incidentFamilyForReason(reason);
    const existing = byFamily.get(family);
    if (!existing) {
      byFamily.set(family, { ...reason, incidentFamily: family });
      continue;
    }
    const mergedSeverity = worse(existing.severity, reason.severity);
    byFamily.set(family, {
      ...existing,
      severity: mergedSeverity,
      detail:
        mergedSeverity === existing.severity && reason.detail.length > existing.detail.length
          ? reason.detail
          : existing.detail,
      incidentFamily: family,
    });
  }

  return [...byFamily.values()];
}

function countBySeverity(
  reasons: CanonicalHealthReason[],
  severity: CanonicalHealthState
): number {
  return reasons.filter((r) => r.severity === severity).length;
}

export function loginStatusLabel(state: CanonicalHealthState): string {
  switch (state) {
    case "healthy":
      return "Production healthy";
    case "warning":
    case "degraded":
      return "Production degraded";
    case "critical":
      return "Production incident detected";
    default:
      return "Status unavailable";
  }
}

export function loginStatusFromCanonical(
  state: CanonicalHealthState,
  reachable: boolean
): string {
  if (!reachable) return "Status unavailable";
  return loginStatusLabel(state);
}

/** Derive canonical state from /api/admin/ops/health JSON (or partial). */
export function deriveCanonicalHealth(payload: unknown): CanonicalHealthSnapshot {
  const data = asRecord(payload);
  const reasons: CanonicalHealthReason[] = [];
  let state: CanonicalHealthState = "unknown";

  const checks = Array.isArray(data.checks) ? data.checks : [];
  for (const raw of checks) {
    const c = asRecord(raw);
    if (isCronHealthCheck(c)) continue;
    // Optional providers unconfigured must not create Critical / Healthy denial.
    if (isOptionalUnconfiguredCheck(c)) continue;

    if (isProbeTimeoutCheck(c)) {
      // Timeouts escalate to warning only; last-known handling is service-level.
      state = worse(state, "warning");
      reasons.push({
        id: `check-timeout-${String(c.id ?? c.label)}`,
        incidentFamily: `probe-timeout:${String(c.id ?? c.label)}`,
        severity: "warning",
        title: `${String(c.label ?? c.id ?? "Probe")} timed out`,
        detail: String(c.message ?? "Probe exceeded budget — using last-known where available"),
        href: "/admin/health",
      });
      continue;
    }

    const mapped = mapCheckStatus(String(c.status ?? "unknown"));
    state = worse(state, mapped === "healthy" ? state : mapped);
    if (mapped === "degraded" || mapped === "critical") {
      reasons.push({
        id: `check-${String(c.id ?? c.label)}`,
        severity: mapped,
        title: String(c.label ?? c.id ?? "Health check"),
        detail: String(c.message ?? `${mapped} · ${c.latencyMs ?? "—"}ms`),
        href: "/admin/health",
      });
    }
  }

  const launch = Array.isArray(data.launchWidgets) ? data.launchWidgets : [];
  for (const raw of launch) {
    const w = asRecord(raw);
    if (isCronLaunchWidget(w)) continue;

    const mapped = mapCheckStatus(String(w.status ?? "unknown"));
    if (mapped === "warning" || mapped === "degraded" || mapped === "critical") {
      state = worse(state, mapped === "warning" ? "warning" : mapped);
      reasons.push({
        id: `launch-${String(w.id)}`,
        severity: mapped === "warning" ? "warning" : mapped,
        title: String(w.label ?? w.id),
        detail: String(w.detail ?? mapped),
        href: "/admin/health",
      });
    }
  }

  const cron = asRecord(data.cron);
  const stale = Array.isArray(cron.staleJobs) ? cron.staleJobs.map(String) : [];
  const cronCheck = checks.find((raw) => isCronHealthCheck(asRecord(raw)));
  const cronWidget = launch.find((raw) => isCronLaunchWidget(asRecord(raw)));
  const cronCheckMapped = cronCheck
    ? mapCheckStatus(String(asRecord(cronCheck).status ?? "unknown"))
    : null;
  const cronWidgetMapped = cronWidget
    ? mapCheckStatus(String(asRecord(cronWidget).status ?? "unknown"))
    : null;

  const cronSignalsDegraded =
    stale.length > 0 ||
    cronCheckMapped === "degraded" ||
    cronCheckMapped === "critical" ||
    cronWidgetMapped === "degraded" ||
    cronWidgetMapped === "critical";

  if (cronSignalsDegraded) {
    const cronSeverity: CanonicalHealthState =
      stale.length >= 3 ||
      cronCheckMapped === "critical" ||
      cronWidgetMapped === "critical"
        ? "critical"
        : stale.length > 0 ||
            cronCheckMapped === "degraded" ||
            cronWidgetMapped === "degraded"
          ? "degraded"
          : "warning";

    state = worse(state, cronSeverity);
    reasons.push({
      id: "incident-cron-execution",
      incidentFamily: CRON_EXECUTION_FAMILY,
      severity: cronSeverity,
      title: "Cron execution degraded",
      detail:
        stale.length > 0
          ? stale.slice(0, 6).join(", ")
          : String(
              asRecord(cronCheck).message ??
                asRecord(cronWidget).detail ??
                "Cron schedules not running on track"
            ),
      href: "/admin/health",
    });
  }

  const jobs = Array.isArray(cron.jobs) ? cron.jobs : [];
  for (const raw of jobs.slice(0, 12)) {
    const j = asRecord(raw);
    if (j.ok === false) {
      state = worse(state, "critical");
      reasons.push({
        id: `cron-fail-${String(j.job)}-${String(j.startedAt)}`,
        severity: "critical",
        title: `Cron failed: ${String(j.job)}`,
        detail: String(j.startedAt ?? "Recent run failed"),
        href: "/admin/health",
      });
    }
  }

  const aggregate = String(data.status ?? "");
  if (aggregate === "unhealthy") state = worse(state, "critical");
  else if (aggregate === "degraded") state = worse(state, "degraded");
  else if (aggregate === "healthy" && state === "unknown" && checks.length > 0) {
    state = "healthy";
  }

  const stability = asRecord(data.stability);
  const providedScore = Number(stability.score);
  const providedGrade =
    typeof stability.grade === "string" ? stability.grade : undefined;

  if (state === "unknown" && checks.length === 0 && !data.status) {
    state = "unknown";
  } else if (state === "unknown" && aggregate === "healthy") {
    state = "healthy";
  }

  // Never advertise Healthy when a critical incident remains after dedupe.
  const unique = dedupeByIncidentFamily(reasons);
  const criticalCount = countBySeverity(unique, "critical");
  const warningCount =
    countBySeverity(unique, "warning") + countBySeverity(unique, "degraded");

  if (criticalCount > 0) {
    state = worse(state, "critical");
  } else if (warningCount > 0 && state === "healthy") {
    state = worse(state, "warning");
  }

  const estimate = estimateScoreFromState(state);
  // Prefer real stability score when provided; never let a synthetic "healthy"
  // score override a worse derived state (callers must pass real scores only
  // from heavy diagnostics — summary path may omit score).
  const score = Number.isFinite(providedScore) ? providedScore : estimate.score;
  const grade = providedGrade ?? estimate.grade;

  const labelMap: Record<CanonicalHealthState, string> = {
    healthy: "Production · Healthy",
    warning: "Production · Warning",
    degraded: "Production · Degraded",
    critical: "Production · Critical",
    unknown: "Production · Unknown",
  };

  return {
    state,
    label: labelMap[state],
    reasons: unique.slice(0, 24),
    checkedAt: String(data.timestamp ?? new Date().toISOString()),
    score,
    grade,
    criticalCount,
    warningCount,
    topIncidents: unique.slice(0, 3),
  };
}

/** Deterministic identity for incident grouping (tenant-agnostic family key). */
export function buildIncidentIdentity(parts: {
  subsystem: string;
  family: string;
  resource?: string | null;
  provider?: string | null;
}): string {
  return [
    parts.subsystem,
    parts.family,
    parts.resource ?? "-",
    parts.provider ?? "-",
  ]
    .map((p) => String(p).toLowerCase().replace(/\s+/g, "-"))
    .join(":");
}

export function headerTone(state: CanonicalHealthState): string {
  return state;
}

/** Normalized incident key for notification deduplication (subsystem + type). */
export function incidentNotificationKey(reason: CanonicalHealthReason): string {
  return incidentFamilyForReason(reason);
}
