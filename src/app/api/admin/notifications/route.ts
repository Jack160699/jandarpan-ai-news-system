/**
 * GET /api/admin/notifications — operational attention feed for the bell.
 * Aggregates collaboration + canonical ops signals (permission-aware).
 */

import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { fetchCollaborationHub } from "@/lib/collaboration/store";
import {
  getRecentOpsErrors,
  getOpsErrorSummary,
  getQueueAnalyticsDashboard,
  runAllHealthChecks,
  aggregateHealthStatus,
  getCronMonitorState,
  computeStabilityScore,
  getMetricsDashboard,
} from "@/lib/observability";
import { getLaunchHealthWidgets } from "@/lib/ops/launch-health";
import { deriveCanonicalHealth } from "@/lib/admin-v3/canonical-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type AdminNotificationItem = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  explanation: string;
  source: string;
  timestamp: string;
  href: string;
  unread: boolean;
  dismissible: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function severityFromState(
  state: string
): "critical" | "warning" | "info" {
  if (state === "critical") return "critical";
  if (state === "degraded" || state === "warning") return "warning";
  return "info";
}

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "content:read");
  if (!guard.ok) return guard.response;

  const role = guard.session.membership.role;
  const items: AdminNotificationItem[] = [];
  let unread = 0;
  const now = new Date().toISOString();

  if (roleHasPermission(role, "editorial:write")) {
    try {
      const hub = await fetchCollaborationHub(
        guard.session.membership.tenantId,
        guard.session.userId
      );
      const notes = Array.isArray(hub?.notifications) ? hub.notifications : [];
      for (const raw of notes) {
        const n = asRecord(raw);
        const id = String(n.id ?? crypto.randomUUID());
        const isUnread = !n.read_at;
        items.push({
          id: `collab-${id}`,
          severity: "info",
          title: String(n.title ?? "Editorial notification"),
          explanation: String(n.body ?? n.message ?? "Open collaboration for details."),
          source: "Editorial",
          timestamp: String(n.created_at ?? now),
          href: String(n.href ?? "/admin/collaboration"),
          unread: isUnread,
          dismissible: true,
        });
        if (isUnread) unread += 1;
      }
    } catch {
      /* optional */
    }
  }

  if (roleHasPermission(role, "monitoring:read")) {
    try {
      const [errorList, errorSummary, queue, checks, cron, metrics, launchWidgets] =
        await Promise.all([
          getRecentOpsErrors(8),
          getOpsErrorSummary(),
          getQueueAnalyticsDashboard(),
          runAllHealthChecks(),
          getCronMonitorState(),
          getMetricsDashboard(),
          getLaunchHealthWidgets(),
        ]);

      const status = aggregateHealthStatus(checks);
      const stability = await computeStabilityScore({
        checks,
        apiSamples: metrics.api,
      });
      const snapshot = deriveCanonicalHealth({
        ok: status !== "unhealthy",
        status,
        stability,
        checks,
        cron,
        launchWidgets,
        timestamp: now,
      });

      for (const reason of snapshot.reasons) {
        const sev = severityFromState(reason.severity);
        items.push({
          id: reason.id,
          severity: sev === "info" ? "warning" : sev,
          title: reason.title,
          explanation: reason.detail,
          source: "Platform",
          timestamp: snapshot.checkedAt,
          href: reason.href || "/admin/health",
          unread: true,
          dismissible: false,
        });
        unread += 1;
      }

      const q = asRecord(queue);
      const totals = asRecord(q.totals);
      const queueDepth = Number(totals.pending ?? q.pending ?? q.currentQueue ?? 0) || 0;
      if (queueDepth > 50) {
        items.push({
          id: `queue-${queueDepth}`,
          severity: queueDepth > 150 ? "critical" : "warning",
          title: "Queue backlog elevated",
          explanation: `${queueDepth} jobs are waiting in the processing queue.`,
          source: "Pipeline",
          timestamp: now,
          href: "/admin/system",
          unread: true,
          dismissible: false,
        });
        unread += 1;
      }

      const summary = asRecord(errorSummary);
      const recentCount = Number(summary.recent24h ?? summary.last24h ?? summary.count ?? 0) || 0;
      if (recentCount > 10) {
        items.push({
          id: "ops-errors-summary",
          severity: recentCount > 20 ? "critical" : "warning",
          title: "Elevated operational errors",
          explanation: `${recentCount} ops errors recorded in the last 24 hours.`,
          source: "Platform",
          timestamp: now,
          href: "/admin/health",
          unread: true,
          dismissible: false,
        });
        unread += 1;
      }

      const list = Array.isArray(errorList) ? errorList : [];
      for (const raw of list.slice(0, 4)) {
        const err = asRecord(raw);
        const ts = String(err.created_at ?? err.ts ?? err.timestamp ?? now);
        const msg = String(err.message ?? "Operational error");
        items.push({
          id: `err-${String(err.id ?? ts)}`,
          severity:
            err.severity === "critical" || err.level === "error" ? "critical" : "warning",
          title: msg.slice(0, 80),
          explanation: String(err.route ?? err.source ?? "See Platform health."),
          source: "Ops",
          timestamp: ts,
          href: "/admin/health",
          unread: true,
          dismissible: false,
        });
        unread += 1;
      }
    } catch {
      /* optional */
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  unique.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const critical = unique.some((i) => i.severity === "critical" && i.unread);
  const warning = unique.some((i) => i.severity === "warning" && i.unread);
  const unreadCount = unique.filter((i) => i.unread).length;

  return NextResponse.json({
    ok: true,
    unread: unreadCount,
    tone: critical ? "critical" : warning ? "warning" : "neutral",
    items: unique.slice(0, 40),
    timestamp: now,
  });
}
