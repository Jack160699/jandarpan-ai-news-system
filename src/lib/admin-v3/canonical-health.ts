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
};

export type CanonicalHealthSnapshot = {
  state: CanonicalHealthState;
  label: string;
  reasons: CanonicalHealthReason[];
  checkedAt: string;
  score?: number;
  grade?: string;
};

const STATE_RANK: Record<CanonicalHealthState, number> = {
  healthy: 0,
  warning: 1,
  degraded: 2,
  critical: 3,
  unknown: 1,
};

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

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Derive canonical state from /api/admin/ops/health JSON (or partial). */
export function deriveCanonicalHealth(payload: unknown): CanonicalHealthSnapshot {
  const data = asRecord(payload);
  const reasons: CanonicalHealthReason[] = [];
  let state: CanonicalHealthState = "unknown";

  const checks = Array.isArray(data.checks) ? data.checks : [];
  for (const raw of checks) {
    const c = asRecord(raw);
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
  if (stale.length > 0) {
    state = worse(state, stale.length >= 3 ? "critical" : "degraded");
    reasons.push({
      id: "cron-stale",
      severity: stale.length >= 3 ? "critical" : "degraded",
      title: "Stale cron jobs",
      detail: stale.slice(0, 6).join(", "),
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
  const score = Number(stability.score);
  const grade = typeof stability.grade === "string" ? stability.grade : undefined;

  if (state === "unknown" && checks.length === 0 && !data.status) {
    state = "unknown";
  } else if (state === "unknown" && aggregate === "healthy") {
    state = "healthy";
  }

  const labelMap: Record<CanonicalHealthState, string> = {
    healthy: "Production · Healthy",
    warning: "Production · Warning",
    degraded: "Production · Degraded",
    critical: "Production · Critical",
    unknown: "Production · Unknown",
  };

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = reasons.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return {
    state,
    label: labelMap[state],
    reasons: unique.slice(0, 24),
    checkedAt: String(data.timestamp ?? new Date().toISOString()),
    score: Number.isFinite(score) ? score : undefined,
    grade,
  };
}

export function headerTone(state: CanonicalHealthState): string {
  return state;
}
