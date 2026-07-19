/**
 * GET /api/admin/notifications — lightweight attention feed for the bell.
 * Ops branch uses canonical health + bounded probes (no runAllHealthChecks).
 */

import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { fetchCollaborationHub } from "@/lib/collaboration/store";
import { buildIncidentFeed, type AdminIncident } from "@/lib/admin-v3/incident-feed";

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
  actions?: Array<{
    id: "open" | "mark_read" | "acknowledge" | "diagnostics";
    label: string;
  }>;
  subsystem?: string;
  businessImpact?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  state?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function incidentToNotification(incident: AdminIncident): AdminNotificationItem {
  return {
    id: incident.id,
    severity: incident.severity,
    title: incident.summary,
    explanation: `${incident.detail}${incident.businessImpact ? ` · ${incident.businessImpact}` : ""}`,
    source:
      incident.subsystem === "translation"
        ? "Translation"
        : incident.subsystem === "ingestion"
          ? "Ingestion"
          : incident.subsystem === "seo"
            ? "SEO"
            : incident.subsystem === "workers"
              ? "Platform"
              : "Platform",
    timestamp: incident.lastUpdatedAt,
    href: incident.href,
    unread: incident.state === "active" && !incident.acknowledged,
    dismissible: false,
    subsystem: incident.subsystem,
    businessImpact: incident.businessImpact,
    firstSeenAt: incident.firstSeenAt,
    lastSeenAt: incident.lastSeenAt,
    state: incident.state,
    actions: [
      { id: "open", label: "Open" },
      { id: "acknowledge", label: "Acknowledge" },
      { id: "diagnostics", label: "View diagnostics" },
    ],
  };
}

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "content:read");
  if (!guard.ok) return guard.response;

  const role = guard.session.membership.role;
  const items: AdminNotificationItem[] = [];
  const now = new Date().toISOString();
  const wall = Date.now();

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
          actions: [
            { id: "open", label: "Open" },
            { id: "mark_read", label: "Mark read" },
          ],
        });
      }
    } catch {
      /* optional */
    }
  }

  let feedTiming: Record<string, number> | undefined;
  let canonicalState: string | undefined;

  if (roleHasPermission(role, "monitoring:read")) {
    try {
      const feed = await buildIncidentFeed();
      feedTiming = feed.timing;
      canonicalState = feed.canonical.state;
      for (const incident of feed.incidents) {
        items.push(incidentToNotification(incident));
      }
    } catch {
      /* optional */
    }
  }

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

  console.info("[admin-notifications]", {
    totalMs: Date.now() - wall,
    unread: unreadCount,
    items: unique.length,
    canonicalState,
    feedTiming,
  });

  return NextResponse.json({
    ok: true,
    unread: unreadCount,
    tone: critical ? "critical" : warning ? "warning" : "neutral",
    items: unique.slice(0, 40),
    timestamp: now,
    timing: { totalMs: Date.now() - wall, ...feedTiming },
    canonicalState,
  });
}
