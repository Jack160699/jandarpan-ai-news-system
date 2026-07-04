/**
 * Production metrics for editorial image pipeline
 */

import { createAdminServerClient } from "@/lib/supabase";

export type ImageMetricsSnapshot = {
  day: string;
  totalJobs: number;
  completed: number;
  failed: number;
  retried: number;
  aiGenerated: number;
  fallbackUsed: number;
  avgLatencyMs: number | null;
  avgQualityScore: number | null;
  providerErrors: number;
  qualityRejections: number;
  successRate: number;
  retryRate: number;
  queueDepth: number;
  processingCount: number;
};

export type MetricsIncrement = {
  completed?: boolean;
  failed?: boolean;
  retried?: boolean;
  aiGenerated?: boolean;
  fallbackUsed?: boolean;
  latencyMs?: number;
  qualityScore?: number;
  providerError?: boolean;
  qualityRejection?: boolean;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function incrementImageMetrics(delta: MetricsIncrement): Promise<void> {
  const supabase = createAdminServerClient();
  const day = todayKey();

  const { data: existing } = await supabase
    .from("editorial_image_metrics_daily")
    .select("*")
    .eq("day", day)
    .maybeSingle();

  const row = existing ?? {
    day,
    total_jobs: 0,
    completed: 0,
    failed: 0,
    retried: 0,
    ai_generated: 0,
    fallback_used: 0,
    avg_latency_ms: null,
    avg_quality_score: null,
    provider_errors: 0,
    quality_rejections: 0,
  };

  const totalJobs = row.total_jobs + 1;
  const completed = row.completed + (delta.completed ? 1 : 0);
  const failed = row.failed + (delta.failed ? 1 : 0);
  const retried = row.retried + (delta.retried ? 1 : 0);
  const aiGenerated = row.ai_generated + (delta.aiGenerated ? 1 : 0);
  const fallbackUsed = row.fallback_used + (delta.fallbackUsed ? 1 : 0);
  const providerErrors = row.provider_errors + (delta.providerError ? 1 : 0);
  const qualityRejections =
    row.quality_rejections + (delta.qualityRejection ? 1 : 0);

  let avgLatencyMs = row.avg_latency_ms;
  if (delta.latencyMs != null) {
    const prev = row.avg_latency_ms ?? delta.latencyMs;
    const prevCount = Math.max(1, completed);
    avgLatencyMs = Math.round(
      (prev * (prevCount - 1) + delta.latencyMs) / prevCount
    );
  }

  let avgQualityScore = row.avg_quality_score;
  if (delta.qualityScore != null && delta.completed) {
    const prev = row.avg_quality_score ?? delta.qualityScore;
    const prevCount = Math.max(1, aiGenerated);
    avgQualityScore =
      Math.round(((prev * (prevCount - 1) + delta.qualityScore) / prevCount) * 1000) /
      1000;
  }

  await supabase.from("editorial_image_metrics_daily").upsert(
    {
      day,
      total_jobs: totalJobs,
      completed,
      failed,
      retried,
      ai_generated: aiGenerated,
      fallback_used: fallbackUsed,
      avg_latency_ms: avgLatencyMs,
      avg_quality_score: avgQualityScore,
      provider_errors: providerErrors,
      quality_rejections: qualityRejections,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "day" }
  );
}

export async function getImageMetricsSnapshot(): Promise<ImageMetricsSnapshot> {
  const supabase = createAdminServerClient();
  const day = todayKey();

  const [metricsRes, pendingRes, processingRes] = await Promise.all([
    supabase
      .from("editorial_image_metrics_daily")
      .select("*")
      .eq("day", day)
      .maybeSingle(),
    supabase
      .from("editorial_image_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("editorial_image_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing"),
  ]);

  const m = metricsRes.data;
  const totalJobs = m?.total_jobs ?? 0;
  const completed = m?.completed ?? 0;

  return {
    day,
    totalJobs,
    completed,
    failed: m?.failed ?? 0,
    retried: m?.retried ?? 0,
    aiGenerated: m?.ai_generated ?? 0,
    fallbackUsed: m?.fallback_used ?? 0,
    avgLatencyMs: m?.avg_latency_ms ?? null,
    avgQualityScore: m?.avg_quality_score ?? null,
    providerErrors: m?.provider_errors ?? 0,
    qualityRejections: m?.quality_rejections ?? 0,
    successRate: totalJobs > 0 ? Math.round((completed / totalJobs) * 1000) / 10 : 0,
    retryRate: totalJobs > 0 ? Math.round(((m?.retried ?? 0) / totalJobs) * 1000) / 10 : 0,
    queueDepth: pendingRes.count ?? 0,
    processingCount: processingRes.count ?? 0,
  };
}

export async function getImageMetricsHistory(days = 7): Promise<
  Array<{
    day: string;
    completed: number;
    failed: number;
    ai_generated: number;
    avg_latency_ms: number | null;
    success_rate: number;
  }>
> {
  const supabase = createAdminServerClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("editorial_image_metrics_daily")
    .select("day, completed, failed, ai_generated, avg_latency_ms, total_jobs")
    .gte("day", since.toISOString().slice(0, 10))
    .order("day", { ascending: false });

  return (data ?? []).map((row) => ({
    day: row.day,
    completed: row.completed,
    failed: row.failed,
    ai_generated: row.ai_generated,
    avg_latency_ms: row.avg_latency_ms,
    success_rate:
      row.total_jobs > 0
        ? Math.round((row.completed / row.total_jobs) * 1000) / 10
        : 0,
  }));
}
