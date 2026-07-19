/**
 * Lightweight admin incident feed for notifications / bell.
 * Must NOT call runAllHealthChecks or heavy usage scans.
 */

import {
  getCanonicalHealth,
  type CanonicalHealthServiceResult,
} from "@/lib/admin-v3/canonical-health-service";
import {
  incidentNotificationKey,
  type CanonicalHealthReason,
  type CanonicalHealthState,
} from "@/lib/admin-v3/canonical-health";
import { getOpsErrorSummary, getRecentOpsErrors } from "@/lib/observability";

export type AdminIncidentSeverity = "critical" | "warning" | "info";

export type AdminIncident = {
  id: string;
  severity: AdminIncidentSeverity;
  subsystem: string;
  type: string;
  summary: string;
  detail: string;
  businessImpact: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastUpdatedAt: string;
  state: "active" | "acknowledged" | "resolved";
  href: string;
  acknowledged: boolean;
  /** Nested affected resources when family-deduped */
  affected?: string[];
};

export type IncidentFeedResult = {
  ok: boolean;
  incidents: AdminIncident[];
  unread: number;
  tone: "critical" | "warning" | "neutral";
  canonical: CanonicalHealthServiceResult["snapshot"];
  totalMs: number;
  checkedAt: string;
  fromCache: boolean;
  timing: { totalMs: number; healthMs: number; extrasMs: number };
};

const ACK_STORE = new Map<string, number>(); // id -> expiresAt
const ACK_TTL_MS = 6 * 60 * 60_000;
const FIRST_SEEN = new Map<string, string>();

function severityFromState(state: CanonicalHealthState): AdminIncidentSeverity {
  if (state === "critical") return "critical";
  if (state === "degraded" || state === "warning") return "warning";
  return "info";
}

function subsystemFor(reason: CanonicalHealthReason): string {
  const hay = `${reason.title} ${reason.detail} ${reason.href}`.toLowerCase();
  if (hay.includes("translation")) return "translation";
  if (hay.includes("cron") || hay.includes("worker")) return "workers";
  if (hay.includes("queue") || hay.includes("ingest")) return "ingestion";
  if (hay.includes("seo") || hay.includes("gsc") || hay.includes("serp")) return "seo";
  if (hay.includes("openai") || hay.includes("cost")) return "ai";
  if (hay.includes("supabase") || hay.includes("database")) return "database";
  if (hay.includes("redis") || hay.includes("cache")) return "cache";
  return "platform";
}

function businessImpactFor(
  severity: AdminIncidentSeverity,
  subsystem: string
): string {
  if (severity === "critical") {
    if (subsystem === "workers") return "Publishing and ingestion may stall.";
    if (subsystem === "database") return "Editorial and reader data access at risk.";
    return "Owner attention required — core operations impaired.";
  }
  if (severity === "warning") {
    return "Service degraded; monitor and remediate soon.";
  }
  return "Informational — no immediate outage.";
}

function toIncident(
  reason: CanonicalHealthReason,
  checkedAt: string,
  ackIds: Set<string>
): AdminIncident {
  const id = incidentNotificationKey(reason);
  const firstSeenAt = FIRST_SEEN.get(id) ?? checkedAt;
  FIRST_SEEN.set(id, firstSeenAt);
  const severity = severityFromState(reason.severity);
  const subsystem = subsystemFor(reason);
  const acknowledged = ackIds.has(id) || Boolean(ACK_STORE.get(id) && (ACK_STORE.get(id)! > Date.now()));

  return {
    id,
    severity,
    subsystem,
    type: reason.incidentFamily ?? id,
    summary: reason.title,
    detail: reason.detail,
    businessImpact: businessImpactFor(severity, subsystem),
    firstSeenAt,
    lastSeenAt: checkedAt,
    lastUpdatedAt: checkedAt,
    state: acknowledged ? "acknowledged" : "active",
    href: reason.href || "/admin/health",
    acknowledged,
  };
}

function pruneAcks() {
  const now = Date.now();
  for (const [id, exp] of ACK_STORE) {
    if (exp <= now) ACK_STORE.delete(id);
  }
}

export function acknowledgeIncident(id: string): boolean {
  if (!id.trim()) return false;
  ACK_STORE.set(id, Date.now() + ACK_TTL_MS);
  return true;
}

export function isIncidentAcknowledged(id: string): boolean {
  pruneAcks();
  const exp = ACK_STORE.get(id);
  return Boolean(exp && exp > Date.now());
}

async function lightQueueSignal(
  health: CanonicalHealthServiceResult
): Promise<AdminIncident | null> {
  const queues = health.metrics.queues as Record<string, unknown> | null;
  if (!queues || typeof queues !== "object") return null;
  const ai = Number(queues.aiPending ?? 0);
  const editorial = Number(queues.editorialImagesPending ?? 0);
  const depth = (Number.isFinite(ai) ? ai : 0) + (Number.isFinite(editorial) ? editorial : 0);
  if (depth <= 50) return null;
  const checkedAt = health.checkedAt;
  const id = "queue-backlog";
  const firstSeenAt = FIRST_SEEN.get(id) ?? checkedAt;
  FIRST_SEEN.set(id, firstSeenAt);
  return {
    id,
    severity: depth > 150 ? "critical" : "warning",
    subsystem: "ingestion",
    type: "queue-backlog",
    summary: "Queue backlog elevated",
    detail: `${depth} jobs waiting in AI/editorial queues.`,
    businessImpact: "Story processing may lag behind publish demand.",
    firstSeenAt,
    lastSeenAt: checkedAt,
    lastUpdatedAt: checkedAt,
    state: isIncidentAcknowledged(id) ? "acknowledged" : "active",
    href: "/admin/system",
    acknowledged: isIncidentAcknowledged(id),
  };
}

async function lightErrorSignal(checkedAt: string): Promise<AdminIncident | null> {
  try {
    const summary = await Promise.race([
      getOpsErrorSummary(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ops_errors_timeout")), 800)
      ),
    ]);
    const rec = summary as Record<string, unknown>;
    const recentCount =
      Number(rec.recent24h ?? rec.last24h ?? rec.count ?? 0) || 0;
    if (recentCount <= 10) return null;
    const id = "ops-errors-summary";
    const firstSeenAt = FIRST_SEEN.get(id) ?? checkedAt;
    FIRST_SEEN.set(id, firstSeenAt);
    return {
      id,
      severity: recentCount > 20 ? "critical" : "warning",
      subsystem: "platform",
      type: "ops-errors",
      summary: "Elevated operational errors",
      detail: `${recentCount} ops errors in the last 24 hours.`,
      businessImpact: "Elevated failure rate may affect publishing reliability.",
      firstSeenAt,
      lastSeenAt: checkedAt,
      lastUpdatedAt: checkedAt,
      state: isIncidentAcknowledged(id) ? "acknowledged" : "active",
      href: "/admin/health",
      acknowledged: isIncidentAcknowledged(id),
    };
  } catch {
    return null;
  }
}

/** Sample recent errors and fold GNews 429 / timeouts into family incidents. */
async function lightRecentErrorFamilies(
  checkedAt: string
): Promise<AdminIncident[]> {
  try {
    const list = await Promise.race([
      getRecentOpsErrors(8),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("recent_errors_timeout")), 800)
      ),
    ]);
    const arr = Array.isArray(list) ? list : [];
    const families = new Map<string, { count: number; sample: string }>();

    for (const raw of arr) {
      const err = raw as Record<string, unknown>;
      const msg = String(err.message ?? "");
      const lower = msg.toLowerCase();
      let family: string | null = null;
      if (lower.includes("gnews") && (lower.includes("429") || lower.includes("rate"))) {
        family = "provider-quota:gnews";
      } else if (lower.includes("429") || lower.includes("rate limit")) {
        family = "provider-quota";
      } else if (lower.includes("timeout") && (lower.includes("query") || lower.includes("db") || lower.includes("supabase"))) {
        family = "database-performance";
      }
      if (!family) continue;
      const prev = families.get(family);
      families.set(family, {
        count: (prev?.count ?? 0) + 1,
        sample: prev?.sample ?? msg.slice(0, 120),
      });
    }

    const out: AdminIncident[] = [];
    for (const [family, meta] of families) {
      const id = family;
      const firstSeenAt = FIRST_SEEN.get(id) ?? checkedAt;
      FIRST_SEEN.set(id, firstSeenAt);
      out.push({
        id,
        severity: meta.count >= 3 ? "critical" : "warning",
        subsystem: family.startsWith("provider") ? "ingestion" : "database",
        type: family,
        summary:
          family === "provider-quota:gnews"
            ? "GNews rate limit active"
            : family === "database-performance"
              ? "Database performance degraded"
              : "Provider quota / rate limit",
        detail: `${meta.count} recent signals · ${meta.sample}`,
        businessImpact:
          family.startsWith("provider")
            ? "Ingestion may skip or delay external source fetches."
            : "Admin and pipeline queries may slow or time out.",
        firstSeenAt,
        lastSeenAt: checkedAt,
        lastUpdatedAt: checkedAt,
        state: isIncidentAcknowledged(id) ? "acknowledged" : "active",
        href: "/admin/health",
        acknowledged: isIncidentAcknowledged(id),
        affected: [`${meta.count} recent log rows`],
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function buildIncidentFeed(): Promise<IncidentFeedResult> {
  const wall = Date.now();
  pruneAcks();

  const healthStarted = Date.now();
  const health = await getCanonicalHealth();
  const healthMs = Date.now() - healthStarted;

  const ackIds = new Set(
    [...ACK_STORE.entries()]
      .filter(([, exp]) => exp > Date.now())
      .map(([id]) => id)
  );

  const incidents: AdminIncident[] = [];
  const seen = new Set<string>();

  for (const reason of health.snapshot.reasons) {
    const item = toIncident(reason, health.checkedAt, ackIds);
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    incidents.push(item);
  }

  const extrasStarted = Date.now();
  const [queueIncident, errorSummary, errorFamilies] = await Promise.all([
    lightQueueSignal(health),
    lightErrorSignal(health.checkedAt),
    lightRecentErrorFamilies(health.checkedAt),
  ]);
  const extrasMs = Date.now() - extrasStarted;

  for (const extra of [queueIncident, errorSummary, ...errorFamilies]) {
    if (!extra) continue;
    if (seen.has(extra.id)) continue;
    seen.add(extra.id);
    incidents.push(extra);
  }

  incidents.sort(
    (a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
  );

  const active = incidents.filter((i) => i.state === "active");
  const critical = active.some((i) => i.severity === "critical");
  const warning = active.some((i) => i.severity === "warning");
  const unread = active.filter((i) => !i.acknowledged).length;

  return {
    ok: true,
    incidents: incidents.slice(0, 40),
    unread,
    tone: critical ? "critical" : warning ? "warning" : "neutral",
    canonical: health.snapshot,
    totalMs: Date.now() - wall,
    checkedAt: health.checkedAt,
    fromCache: health.fromCache,
    timing: {
      totalMs: Date.now() - wall,
      healthMs,
      extrasMs,
    },
  };
}

/** Test helpers */
export function resetIncidentFeedStateForTests(): void {
  ACK_STORE.clear();
  FIRST_SEEN.clear();
}
