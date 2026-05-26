import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { ScheduledReportRow } from "@/lib/analytics/types";

export async function listScheduledReports(
  tenantId: string
): Promise<ScheduledReportRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("analytics_report_schedules")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapRow);
}

export async function createScheduledReport(input: {
  tenantId: string;
  createdBy?: string | null;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "json";
  windowHours: number;
  email?: string | null;
}): Promise<ScheduledReportRow | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const nextRunAt = computeNextRun(input.frequency);

  const { data, error } = await supabase
    .from("analytics_report_schedules")
    .insert({
      tenant_id: input.tenantId,
      created_by: input.createdBy ?? null,
      name: input.name,
      frequency: input.frequency,
      format: input.format,
      window_hours: input.windowHours,
      email: input.email ?? null,
      enabled: true,
      next_run_at: nextRunAt,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function deleteScheduledReport(
  tenantId: string,
  scheduleId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("analytics_report_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("tenant_id", tenantId);

  return !error;
}

function mapRow(row: Record<string, unknown>): ScheduledReportRow {
  return {
    id: row.id as string,
    name: row.name as string,
    frequency: row.frequency as ScheduledReportRow["frequency"],
    format: row.format as ScheduledReportRow["format"],
    windowHours: row.window_hours as number,
    email: (row.email as string) ?? null,
    enabled: Boolean(row.enabled),
    lastRunAt: (row.last_run_at as string) ?? null,
    nextRunAt: (row.next_run_at as string) ?? null,
  };
}

function computeNextRun(frequency: string): string {
  const d = new Date();
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  d.setHours(6, 0, 0, 0);
  return d.toISOString();
}
