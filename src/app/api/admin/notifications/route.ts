/**
 * GET /api/admin/notifications — operational attention feed for the bell.
 * Aggregates collaboration notifications + ops signals (permission-aware).
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
} from "@/lib/observability";

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

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "content:read");
  if (!guard.ok) return guard.response;

  const role = guard.session.membership.role;
  const items: AdminNotificationItem[] = [];
  let unread = 0;

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
          timestamp: String(n.created_at ?? new Date().toISOString()),
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
      const [errorList, errorSummary, queue, checks] = await Promise.all([
        getRecentOpsErrors(12),
        getOpsErrorSummary(),
        getQueueAnalyticsDashboard(),
        runAllHealthChecks(),
      ]);

      const status = aggregateHealthStatus(checks);
      if (status === "unhealthy") {
        items.push({
          id: "health-unhealthy",
          severity: "critical",
          title: "Platform health degraded",
          explanation: "One or more health checks are failing. Review Platform health.",
          source: "Platform",
          timestamp: new Date().toISOString(),
          href: "/admin/technical",
          unread: true,
          dismissible: false,
        });
        unread += 1;
      } else if (status === "degraded") {
        items.push({
          id: "health-degraded",
          severity: "warning",
          title: "Platform health warning",
          explanation: "Some checks are degraded. Inspect Platform for details.",
          source: "Platform",
          timestamp: new Date().toISOString(),
          href: "/admin/technical",
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
          timestamp: new Date().toISOString(),
          href: "/admin/system",
          unread: true,
          dismissible: false,
        });
        unread += 1;
      }

      const summary = asRecord(errorSummary);
      const recentCount = Number(summary.recent24h ?? summary.count ?? 0) || 0;
      if (recentCount > 0) {
        items.push({
          id: "ops-errors-summary",
          severity: recentCount > 20 ? "critical" : "warning",
          title: "Recent operational errors",
          explanation: `${recentCount} ops error${recentCount === 1 ? "" : "s"} recorded recently.`,
          source: "Platform",
          timestamp: new Date().toISOString(),
          href: "/admin/health",
          unread: true,
          dismissible: false,
        });
        unread += 1;
      }

      const list = Array.isArray(errorList) ? errorList : [];
      for (const raw of list.slice(0, 6)) {
        const err = asRecord(raw);
        const ts = String(err.created_at ?? err.timestamp ?? new Date().toISOString());
        const msg = String(err.message ?? "Operational error");
        items.push({
          id: `err-${String(err.id ?? ts)}`,
          severity:
            err.severity === "critical" || err.level === "error" ? "critical" : "warning",
          title: msg.slice(0, 80),
          explanation: String(err.route ?? err.source ?? "See Platform health for context."),
          source: "Ops",
          timestamp: ts,
          href: "/admin/health",
          unread: true,
          dismissible: false,
        });
      }
    } catch {
      /* optional */
    }
  }

  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const critical = items.some((i) => i.severity === "critical" && i.unread);
  const warning = items.some((i) => i.severity === "warning" && i.unread);

  return NextResponse.json({
    ok: true,
    unread,
    tone: critical ? "critical" : warning ? "warning" : "neutral",
    items: items.slice(0, 40),
    timestamp: new Date().toISOString(),
  });
}
