/**
 * Server-side assembly of the admin control-center view model.
 *
 * Reads public.admin_ops_snapshot() (one RPC, service role, real tables) and layers the
 * health evaluation on top. Heavy admin queries live here, isolated from every public
 * feed path; the result is cached briefly so the dashboard never hammers the database.
 * Server-only: uses the service-role client.
 */

import { unstable_cache } from "next/cache";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { RSS_SOURCES } from "@/lib/news/providers/rss-sources";
import {
  ageMinutes,
  categorizeFailure,
  evaluateDistrictCoverage,
  evaluateJobs,
  evaluatePace,
  evaluateSources,
  evaluateSubsystems,
  freshnessTone,
  geoShares,
  worst,
  type DistrictCoverage,
  type FailureCategory,
  type GeoShares,
  type JobHealth,
  type PaceStatus,
  type SourceRowView,
  type SubsystemStatus,
} from "@/lib/admin-ops/health";
import { googleTtsConfigured } from "@/lib/voice/google-auth";
import type { FunnelCounts, OpsSnapshotRaw, Tone, VoiceSampleView, VoiceSnapshot } from "@/lib/admin-ops/types";

export const OPS_SNAPSHOT_TAG = "admin-ops-snapshot";
export const DAILY_PUBLISH_TARGET = Number(process.env.DAILY_PUBLISH_TARGET) || 100;

export type FunnelStep = { key: keyof FunnelCounts; label: string; hour: number; today: number; day: number };

export type FailureGroup = {
  category: FailureCategory;
  total: number;
  items: Array<{ source: string; reason: string; n: number }>;
};

export type OpsView = {
  generatedAt: string;
  snapshotLatencyMs: number;
  kpis: {
    totalUsers: number;
    activeToday: number;
    active7d: number;
    new30d: number;
    publishedToday: number;
    signalsToday: number;
    pendingEditorialQueue: number;
    legacyAiQueuePending: number;
    freshnessLagMinutes: number | null;
    freshnessTone: Tone;
    queueTone: Tone;
    signalsTone: Tone;
  };
  users: OpsSnapshotRaw["users"];
  publishing: OpsSnapshotRaw["publishing"] & {
    lagMinutes: number | null;
    pace: PaceStatus;
  };
  funnel: FunnelStep[];
  jobs: JobHealth[];
  sources: SourceRowView[];
  sourceSummary: Record<string, number>;
  providerErrors: OpsSnapshotRaw["sources"]["provider_errors_24h"];
  geo: {
    shares: GeoShares;
    sharesToday: GeoShares;
    districts: DistrictCoverage[];
    legacyUnverified: number;
  };
  language: OpsSnapshotRaw["language"];
  failures: FailureGroup[];
  queue: OpsSnapshotRaw["queue"];
  ai: OpsSnapshotRaw["ai"];
  performance: OpsSnapshotRaw["performance"];
  subsystems: SubsystemStatus[];
  overall: Tone;
  scheduler: { pgCronInstalled: boolean; dispatch: OpsSnapshotRaw["scheduler"] };
  voice: {
    configured: boolean;
    snapshot: VoiceSnapshot | null;
    samples: { runId: string; at: string; status: string; items: VoiceSampleView[] } | null;
  };
};

export type VoiceData = { snapshot: VoiceSnapshot | null; samples: OpsView["voice"]["samples"] };

const FUNNEL_LABELS: Array<[keyof FunnelCounts, string]> = [
  ["fetched", "Fetched"],
  ["normalized", "Normalized / validated"],
  ["duplicates_removed", "Duplicates removed"],
  ["signals_inserted", "Signals stored"],
  ["geo_classified", "Geo classified"],
  ["clustered_events", "Clustered into events"],
  ["editorial_candidates", "Editorial candidates"],
  ["ai_generated", "AI generated"],
  ["qa_passed", "QA passed"],
  ["published", "Published"],
];

export function buildOpsView(
  raw: OpsSnapshotRaw,
  runtime: { snapshotLatencyMs: number; now?: number; voice?: VoiceData }
): OpsView {
  const now = runtime.now ?? Date.now();
  const lagMinutes = ageMinutes(raw.publishing.latest?.published_at, now);
  const pace = evaluatePace({
    today: raw.publishing.today,
    target: raw.publishing.target,
    istHour: raw.publishing.ist_hour_now,
    istMinute: raw.publishing.ist_minute_now,
    lastPublishAgeMinutes: lagMinutes,
  });

  const jobs = evaluateJobs(raw, now);
  const knownRss = new Set(RSS_SOURCES.map((s) => s.id));
  const sources = evaluateSources(raw, knownRss, now);
  const sourceSummary: Record<string, number> = {};
  for (const s of sources) sourceSummary[s.status] = (sourceSummary[s.status] ?? 0) + 1;

  const subsystems = evaluateSubsystems(
    raw,
    jobs,
    sources,
    {
      redisConfigured: isRedisConfigured(),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      vercelRegion: process.env.VERCEL_REGION ?? null,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      snapshotLatencyMs: runtime.snapshotLatencyMs,
    },
    now
  );

  const awaiting = raw.queue.events_awaiting_article;
  const queueTone: Tone = awaiting > raw.publishing.target * 3 ? "critical" : awaiting > raw.publishing.target ? "warning" : "healthy";
  const signalsTone: Tone = raw.signals.last_1h === 0 ? "critical" : raw.signals.last_1h < 5 ? "warning" : "healthy";

  const funnel: FunnelStep[] = FUNNEL_LABELS.map(([key, label]) => ({
    key,
    label,
    hour: raw.funnel.last_1h[key] ?? 0,
    today: raw.funnel.today[key] ?? 0,
    day: raw.funnel.last_24h[key] ?? 0,
  }));

  // Failure center: group every source of failure under the requested categories.
  const groups = new Map<FailureCategory, FailureGroup>();
  const add = (source: string, reason: string, n: number) => {
    const category = categorizeFailure(reason);
    const g = groups.get(category) ?? { category, total: 0, items: [] };
    g.total += n;
    g.items.push({ source, reason, n });
    groups.set(category, g);
  };
  for (const r of raw.failures.editorial_skip_reasons_24h) add("editorial (24h)", r.reason, Number(r.n));
  for (const r of raw.failures.ai_queue_reasons) add(`ai_queue:${r.status}`, r.reason, Number(r.n));
  for (const r of raw.failures.dead_jobs) add(`worker_jobs:${r.job_type}`, r.reason, Number(r.n));
  for (const r of raw.failures.ai_failures_24h) add(`ai:${r.provider}/${r.model}`, r.reason, Number(r.n));
  for (const r of raw.failures.cron_failures_24h) add(`cron:${r.job}`, r.last_error || "cron failure", Number(r.n));
  for (const [code, n] of Object.entries(raw.language.gate_failure_codes_24h ?? {})) add("publication gate", code, Number(n));
  for (const r of raw.sources.provider_errors_24h) add("ingestion", r.error, Number(r.n));
  const failures = [...groups.values()]
    .map((g) => ({ ...g, items: g.items.sort((a, b) => b.n - a.n) }))
    .sort((a, b) => b.total - a.total);

  const overall = worst(
    freshnessTone(lagMinutes),
    pace.tone,
    ...subsystems.filter((s) => ["fetch-news", "editorial-ai", "cron", "database"].includes(s.id)).map((s) => s.tone)
  );

  return {
    generatedAt: raw.generated_at,
    snapshotLatencyMs: runtime.snapshotLatencyMs,
    kpis: {
      totalUsers: raw.users.total,
      activeToday: raw.users.active_today,
      active7d: raw.users.active_7d,
      new30d: raw.users.new_30d,
      publishedToday: raw.publishing.today,
      signalsToday: raw.signals.today,
      pendingEditorialQueue: awaiting,
      legacyAiQueuePending: raw.queue.ai_queue.pending ?? 0,
      freshnessLagMinutes: lagMinutes,
      freshnessTone: freshnessTone(lagMinutes),
      queueTone,
      signalsTone,
    },
    users: raw.users,
    publishing: { ...raw.publishing, lagMinutes, pace },
    funnel,
    jobs,
    sources,
    sourceSummary,
    providerErrors: raw.sources.provider_errors_24h,
    geo: {
      shares: geoShares(raw.geo.scope_24h),
      sharesToday: geoShares(raw.geo.scope_today),
      districts: evaluateDistrictCoverage(raw, now),
      legacyUnverified: raw.geo.legacy_unverified_district_rows,
    },
    language: raw.language,
    failures,
    queue: raw.queue,
    ai: raw.ai,
    performance: raw.performance,
    subsystems,
    overall,
    scheduler: { pgCronInstalled: raw.pg_cron_installed, dispatch: raw.scheduler },
    voice: {
      configured: googleTtsConfigured(),
      snapshot: runtime.voice?.snapshot ?? null,
      samples: runtime.voice?.samples ?? null,
    },
  };
}

async function fetchRawSnapshot(): Promise<{ raw: OpsSnapshotRaw; latencyMs: number }> {
  if (!isSupabaseConfigured()) throw new Error("supabase_not_configured");
  const started = Date.now();
  const supabase = createAdminServerClient();
  const { data, error } = await supabase.rpc("admin_ops_snapshot" as never, {
    p_daily_target: DAILY_PUBLISH_TARGET,
  } as never);
  if (error) throw new Error(`admin_ops_snapshot: ${error.message}`);
  return { raw: data as unknown as OpsSnapshotRaw, latencyMs: Date.now() - started };
}

const cachedRawSnapshot = unstable_cache(fetchRawSnapshot, ["admin-ops-snapshot-v1"], {
  revalidate: 30,
  tags: [OPS_SNAPSHOT_TAG],
});

/** Voice monitoring data. Every part is optional: a missing migration must never break the dashboard. */
async function fetchVoiceData(): Promise<VoiceData> {
  if (!isSupabaseConfigured()) return { snapshot: null, samples: null };
  const supabase = createAdminServerClient();
  const [snap, run] = await Promise.all([
    supabase.rpc("admin_voice_snapshot" as never).then((r) => (r.error ? null : (r.data as unknown as VoiceSnapshot)), () => null),
    supabase
      .from("admin_manual_runs" as never)
      .select("id,status,detail,created_at")
      .eq("action", "voice_test")
      .in("status", ["ok", "failed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => (r.error ? null : (r.data as { id: string; status: string; detail: { samples?: VoiceSampleView[] } | null; created_at: string } | null)), () => null),
  ]);
  const samples = run?.detail?.samples
    ? { runId: run.id, at: run.created_at, status: run.status, items: run.detail.samples }
    : null;
  return { snapshot: snap, samples };
}

export async function getOpsView(options?: { fresh?: boolean }): Promise<OpsView> {
  const [{ raw, latencyMs }, voice] = await Promise.all([
    options?.fresh ? fetchRawSnapshot() : cachedRawSnapshot(),
    fetchVoiceData(),
  ]);
  return buildOpsView(raw, { snapshotLatencyMs: latencyMs, voice });
}
