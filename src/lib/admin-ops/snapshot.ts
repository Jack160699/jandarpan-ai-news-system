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
  FAILURE_CLASSES,
  FAILURE_CLASS_LABEL,
  categorizeFailureItem,
  failureClassOf,
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
  type FailureClass,
  type GeoShares,
  type JobHealth,
  type PaceStatus,
  type SourceRowView,
  type SubsystemStatus,
} from "@/lib/admin-ops/health";
import { googleTtsConfigured } from "@/lib/voice/google-auth";
import { buildFeedIntegrity, type FeedIntegrityRaw, type FeedIntegrityView } from "@/lib/admin-ops/feed-integrity";
import { buildEfficiencyView, type EfficiencyRaw, type EfficiencyView } from "@/lib/admin-ops/efficiency";
import type { FunnelCounts, OpsSnapshotRaw, Tone, VoiceSampleView, VoiceSnapshot } from "@/lib/admin-ops/types";

export const OPS_SNAPSHOT_TAG = "admin-ops-snapshot";
export const DAILY_PUBLISH_TARGET = Number(process.env.DAILY_PUBLISH_TARGET) || 100;

export type FunnelStep = { key: keyof FunnelCounts; label: string; hour: number; today: number; day: number };

export type FailureGroup = {
  category: FailureCategory;
  total: number;
  items: Array<{ source: string; reason: string; n: number }>;
};

/** Explicit run outcomes recorded by the Edge workers (ops_cron_runs.metadata.outcome) in the last 24h. */
export type OutcomeCounts = {
  /** false when it could not be read - the dashboard then shows only the classic sources, never invents zeros. */
  known: boolean;
  byOutcome: Array<{ job: string; outcome: string; n: number }>;
  deadLetteredCandidates24h: number;
};

export const UNKNOWN_OUTCOME_COUNTS: OutcomeCounts = { known: false, byOutcome: [], deadLetteredCandidates24h: 0 };

/** One tile of the failure center: a business/ops class, never mixed with infrastructure failure. */
export type FailureClassSummary = { klass: FailureClass; label: string; total: number };

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
  /** Fixed six-class summary (infrastructure / quality / stale-freshness / no-work / quarantine / dead-letter). */
  failureClasses: FailureClassSummary[];
  queue: OpsSnapshotRaw["queue"];
  ai: OpsSnapshotRaw["ai"];
  performance: OpsSnapshotRaw["performance"];
  subsystems: SubsystemStatus[];
  overall: Tone;
  scheduler: { pgCronInstalled: boolean; dispatch: OpsSnapshotRaw["scheduler"]; control: SchedulerControl };
  /** The one-glance answer: is the publishing pipeline running, stalled, or deliberately paused? */
  pipeline: PipelineState;
  voice: {
    configured: boolean;
    snapshot: VoiceSnapshot | null;
    samples: { runId: string; at: string; status: string; items: VoiceSampleView[] } | null;
  };
  /** Public-feed integrity (canonical gate + geography + language). null when migration 099 is not applied or the read failed. */
  integrity: FeedIntegrityView | null;
  /** Recorded editorial efficiency (repair / rejection / latency / tokens). null when unavailable: never a made-up zero. */
  efficiency: EfficiencyView | null;
};

/** scheduler_control (migration 089): the database kill switch + the retention switch. */
export type SchedulerControl = {
  /** false when the table could not be read (migration not applied) - never assume the scheduler is on. */
  known: boolean;
  enabled: boolean | null;
  pruneEnabled: boolean | null;
  lastPruneAt: string | null;
};

export type PipelineState = { state: "running" | "stalled" | "paused"; reason: string };

export const UNKNOWN_SCHEDULER_CONTROL: SchedulerControl = { known: false, enabled: null, pruneEnabled: null, lastPruneAt: null };

/** Pure: derive running / stalled / paused from the kill switch and publication freshness. */
export function derivePipelineState(input: {
  control: SchedulerControl;
  paceMessage: string;
  lagMinutes: number | null;
}): PipelineState {
  if (input.control.known && input.control.enabled === false) {
    return { state: "paused", reason: "Scheduler kill switch is OFF - nothing is being dispatched" };
  }
  if (input.paceMessage === "Publishing pipeline stalled") {
    const lag = input.lagMinutes;
    return { state: "stalled", reason: lag === null ? "No article has ever been published" : `No article published for ${lag >= 120 ? Math.round(lag / 60) + " h" : Math.round(lag) + " min"}` };
  }
  return {
    state: "running",
    reason: input.lagMinutes === null ? "Publishing" : `Last publish ${input.lagMinutes >= 120 ? Math.round(input.lagMinutes / 60) + " h" : Math.round(input.lagMinutes) + " min"} ago`,
  };
}

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
  runtime: {
    snapshotLatencyMs: number;
    now?: number;
    voice?: VoiceData;
    schedulerControl?: SchedulerControl;
    outcomes?: OutcomeCounts;
    integrity?: FeedIntegrityRaw | null;
    efficiency?: EfficiencyRaw | null;
  }
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
  const control = runtime.schedulerControl ?? UNKNOWN_SCHEDULER_CONTROL;
  const sources = evaluateSources(raw, knownRss, now, { schedulerPaused: control.known && control.enabled === false });
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
  const add = (source: string, reason: string, n: number, status?: string | null) => {
    const category = categorizeFailureItem({ reason, status, source });
    const g = groups.get(category) ?? { category, total: 0, items: [] };
    g.total += n;
    g.items.push({ source, reason, n });
    groups.set(category, g);
  };
  for (const r of raw.failures.editorial_skip_reasons_24h) add("editorial (24h)", r.reason, Number(r.n));
  for (const r of raw.failures.ai_queue_reasons) add(`ai_queue:${r.status}`, r.reason, Number(r.n), r.status);
  for (const r of raw.failures.dead_jobs) add(`worker_jobs:${r.job_type}`, r.reason, Number(r.n), "dead");
  for (const r of raw.failures.ai_failures_24h) add(`ai:${r.provider}/${r.model}`, r.reason, Number(r.n));
  for (const r of raw.failures.cron_failures_24h) add(`cron:${r.job}`, r.last_error || "cron failure", Number(r.n));
  for (const [code, n] of Object.entries(raw.language.gate_failure_codes_24h ?? {})) add("publication gate", code, Number(n));
  for (const r of raw.sources.provider_errors_24h) add("ingestion", r.error, Number(r.n));
  // Explicit worker outcomes: business rejections / empty shards are recorded as outcomes (ok=true runs), so they no longer
  // masquerade as cron failures. "failure" is already counted above through ok=false runs, so it is skipped here.
  const outcomes = runtime.outcomes ?? UNKNOWN_OUTCOME_COUNTS;
  const NOT_A_PROBLEM = new Set(["published", "ok", "degraded", "failure", "generated_unpublished", "skipped", "kill_switch_off"]);
  for (const o of outcomes.byOutcome) if (!NOT_A_PROBLEM.has(o.outcome)) add(`edge:${o.job}`, o.outcome, o.n);
  if (outcomes.deadLetteredCandidates24h > 0) add("editorial candidates", "dead_lettered", outcomes.deadLetteredCandidates24h, "dead_lettered");
  const failures = [...groups.values()]
    .map((g) => ({ ...g, items: g.items.sort((a, b) => b.n - a.n) }))
    .sort((a, b) => b.total - a.total);

  const classTotals = new Map<FailureClass, number>(FAILURE_CLASSES.map((k) => [k, 0]));
  for (const g of failures) classTotals.set(failureClassOf(g.category), (classTotals.get(failureClassOf(g.category)) ?? 0) + g.total);
  const failureClasses: FailureClassSummary[] = FAILURE_CLASSES.map((klass) => ({ klass, label: FAILURE_CLASS_LABEL[klass], total: classTotals.get(klass) ?? 0 }));

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
    failureClasses,
    queue: raw.queue,
    ai: raw.ai,
    performance: raw.performance,
    subsystems,
    overall,
    scheduler: {
      pgCronInstalled: raw.pg_cron_installed,
      dispatch: raw.scheduler,
      control: runtime.schedulerControl ?? UNKNOWN_SCHEDULER_CONTROL,
    },
    pipeline: derivePipelineState({
      control: runtime.schedulerControl ?? UNKNOWN_SCHEDULER_CONTROL,
      paceMessage: pace.message,
      lagMinutes,
    }),
    voice: {
      configured: googleTtsConfigured(),
      snapshot: runtime.voice?.snapshot ?? null,
      samples: runtime.voice?.samples ?? null,
    },
    integrity: runtime.integrity ? buildFeedIntegrity(runtime.integrity, new Date(now)) : null,
    efficiency: runtime.efficiency ? buildEfficiencyView(runtime.efficiency) : null,
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

/** Kill switch state. Optional like voice: a missing migration must never break the dashboard. */
async function fetchSchedulerControl(): Promise<SchedulerControl> {
  if (!isSupabaseConfigured()) return UNKNOWN_SCHEDULER_CONTROL;
  try {
    const { data, error } = await createAdminServerClient()
      .from("scheduler_control" as never)
      .select("enabled,prune_enabled,last_prune_at")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return UNKNOWN_SCHEDULER_CONTROL;
    const row = data as { enabled: boolean; prune_enabled: boolean; last_prune_at: string | null };
    return { known: true, enabled: row.enabled, pruneEnabled: row.prune_enabled, lastPruneAt: row.last_prune_at };
  } catch {
    return UNKNOWN_SCHEDULER_CONTROL;
  }
}

/** Explicit worker outcomes from the last 24h. Optional like the others: failure to read it never breaks the dashboard. */
async function fetchOutcomeCounts(): Promise<OutcomeCounts> {
  if (!isSupabaseConfigured()) return UNKNOWN_OUTCOME_COUNTS;
  try {
    const supabase = createAdminServerClient();
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const [runs, dead] = await Promise.all([
      supabase.from("ops_cron_runs" as never).select("job,metadata").gte("created_at", since).not("metadata->>outcome", "is", null).limit(3000),
      supabase.from("editorial_candidate_attempts" as never).select("event_id", { count: "exact", head: true }).gte("dead_lettered_at", since),
    ]);
    if (runs.error) return UNKNOWN_OUTCOME_COUNTS;
    const tally = new Map<string, { job: string; outcome: string; n: number }>();
    for (const r of ((runs.data ?? []) as unknown) as Array<{ job: string; metadata: { outcome?: string } | null }>) {
      const outcome = r.metadata?.outcome;
      if (!outcome) continue;
      const key = `${r.job}|${outcome}`;
      const cur = tally.get(key) ?? { job: r.job, outcome, n: 0 };
      cur.n += 1;
      tally.set(key, cur);
    }
    return { known: true, byOutcome: [...tally.values()], deadLetteredCandidates24h: Number(dead.count ?? 0) };
  } catch {
    return UNKNOWN_OUTCOME_COUNTS;
  }
}

/** Rows for the integrity view (migration 099). Optional: a missing migration or a failed read yields null, never a break. */
async function fetchFeedIntegrityRaw(): Promise<FeedIntegrityRaw | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await createAdminServerClient().rpc("admin_feed_integrity" as never, { p_limit: 400 } as never);
    if (error || !data) return null;
    return data as unknown as FeedIntegrityRaw;
  } catch {
    return null;
  }
}

/** Recorded editorial efficiency over the last 24 h (migration 099). Same fail-soft contract. */
async function fetchEfficiencyRaw(): Promise<EfficiencyRaw | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await createAdminServerClient().rpc("admin_editorial_efficiency" as never, { p_hours: 24 } as never);
    if (error || !data) return null;
    return data as unknown as EfficiencyRaw;
  } catch {
    return null;
  }
}

const cachedIntegrity = unstable_cache(fetchFeedIntegrityRaw, ["admin-feed-integrity-v1"], { revalidate: 60, tags: [OPS_SNAPSHOT_TAG] });
const cachedEfficiency = unstable_cache(fetchEfficiencyRaw, ["admin-editorial-efficiency-v1"], { revalidate: 120, tags: [OPS_SNAPSHOT_TAG] });

export async function getOpsView(options?: { fresh?: boolean }): Promise<OpsView> {
  const [{ raw, latencyMs }, voice, schedulerControl, outcomes, integrity, efficiency] = await Promise.all([
    options?.fresh ? fetchRawSnapshot() : cachedRawSnapshot(),
    fetchVoiceData(),
    fetchSchedulerControl(),
    fetchOutcomeCounts(),
    options?.fresh ? fetchFeedIntegrityRaw() : cachedIntegrity(),
    options?.fresh ? fetchEfficiencyRaw() : cachedEfficiency(),
  ]);
  return buildOpsView(raw, { snapshotLatencyMs: latencyMs, voice, schedulerControl, outcomes, integrity, efficiency });
}
