/**
 * Daily Newsroom Audit Report -> admin notification bell integration.
 * Reads unresolved daily_newsroom_notifications rows and maps them into the
 * same AdminNotificationItem shape /api/admin/notifications already returns
 * for the collaboration and ops-incident feeds. See
 * src/app/api/admin/notifications/route.ts (merge point) and
 * src/app/api/admin/notifications/actions/route.ts (acknowledge handling).
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { AdminNotificationItem } from "@/app/api/admin/notifications/route";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  severity: "informational" | "success" | "warning" | "critical";
  category: string;
  action_url: string | null;
  created_at: string;
  acknowledged_at: string | null;
};

function mapSeverity(severity: NotificationRow["severity"]): "critical" | "warning" | "info" {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  // informational | success -> the bell's type only has critical|warning|info.
  return "info";
}

/** Unresolved (resolved_at is null) daily_newsroom_notifications, newest first. */
export async function fetchNewsroomAuditNotifications(): Promise<AdminNotificationItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from("daily_newsroom_notifications" as never)
      .select("id,title,message,severity,category,action_url,created_at,acknowledged_at")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as NotificationRow[];
    return rows.map((row) => ({
      id: `audit-${row.id}`,
      severity: mapSeverity(row.severity),
      title: row.title,
      explanation: row.message,
      source: "Newsroom audit",
      timestamp: row.created_at,
      href: row.action_url ?? "/admin/reports/daily",
      unread: !row.acknowledged_at,
      dismissible: false,
      subsystem: row.category,
      actions: [
        { id: "open", label: "Open" },
        { id: "acknowledge", label: "Acknowledge" },
      ],
    }));
  } catch {
    return [];
  }
}

/** Persists an acknowledge action for one daily_newsroom_notifications row. */
export async function acknowledgeNewsroomAuditNotification(
  notificationId: string,
  acknowledgedBy: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = createAdminServerClient();
    const { error } = await supabase
      .from("daily_newsroom_notifications" as never)
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy,
      } as never)
      .eq("id", notificationId);
    if (error) throw new Error(error.message);
    return true;
  } catch {
    return false;
  }
}
