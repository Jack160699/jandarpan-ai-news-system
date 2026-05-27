/**
 * Worker job monitoring and health metrics
 */

import { createAdminClient } from "@/lib/supabase";
import { asJsonObject, type JsonObject } from "@/types/json";

export type JobRunRecord = {
  workerId: string;
  jobId?: string | null;
  jobType?: string | null;
  tenantId?: string | null;
  ok: boolean;
  durationMs: number;
  skipped?: boolean;
  error?: string;
  metadata?: JsonObject;
};

export async function recordJobRun(input: JobRunRecord): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("worker_job_runs").insert({
    worker_id: input.workerId,
    job_id: input.jobId ?? null,
    job_type: input.jobType ?? null,
    tenant_id: input.tenantId ?? null,
    ok: input.ok,
    duration_ms: input.durationMs,
    skipped: input.skipped ?? false,
    error: input.error ?? null,
    metadata: asJsonObject(input.metadata ?? {}),
  });
}

export type WorkerHealthSummary = {
  workerId: string;
  runs24h: number;
  successRate: number;
  avgDurationMs: number;
  lastRunAt: string | null;
  lastError: string | null;
};

export async function getWorkerHealth(
  hours = 24
): Promise<WorkerHealthSummary[]> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const { data, error } = await supabase
    .from("worker_job_runs")
    .select("worker_id, ok, duration_ms, error, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data?.length) return [];

  const byWorker = new Map<
    string,
    { ok: number; total: number; durationSum: number; lastError: string | null; lastAt: string }
  >();

  for (const row of data) {
    const w = row.worker_id;
    const cur = byWorker.get(w) ?? {
      ok: 0,
      total: 0,
      durationSum: 0,
      lastError: null,
      lastAt: row.created_at,
    };
    cur.total += 1;
    if (row.ok) cur.ok += 1;
    cur.durationSum += row.duration_ms ?? 0;
    if (!cur.lastError && row.error) cur.lastError = row.error;
    byWorker.set(w, cur);
  }

  return [...byWorker.entries()].map(([workerId, stats]) => ({
    workerId,
    runs24h: stats.total,
    successRate:
      stats.total > 0 ? Math.round((stats.ok / stats.total) * 1000) / 1000 : 0,
    avgDurationMs:
      stats.total > 0 ? Math.round(stats.durationSum / stats.total) : 0,
    lastRunAt: stats.lastAt,
    lastError: stats.lastError,
  }));
}

export async function getQueueStats(): Promise<{
  pending: number;
  claimed: number;
  deadLetters: number;
  byType: Record<string, number>;
}> {
  const supabase = createAdminClient();

  const [pendingRes, claimedRes, dlRes, typeRes] = await Promise.all([
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "claimed"),
    supabase
      .from("worker_dead_letters")
      .select("id", { count: "exact", head: true }),
    supabase.from("worker_jobs").select("job_type").eq("status", "pending"),
  ]);

  const byType: Record<string, number> = {};
  for (const row of typeRes.data ?? []) {
    byType[row.job_type] = (byType[row.job_type] ?? 0) + 1;
  }

  return {
    pending: pendingRes.count ?? 0,
    claimed: claimedRes.count ?? 0,
    deadLetters: dlRes.count ?? 0,
    byType,
  };
}
