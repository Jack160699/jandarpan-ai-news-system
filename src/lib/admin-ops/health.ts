/**
 * Health evaluation for the admin control center. Pure functions over the real snapshot —
 * every status, message and threshold here is derived from measured data, never hard-coded.
 */

import { CG_DISTRICTS } from "@/lib/regional/districts";
import { SCHEDULER_JOBS, stallThresholdMs } from "@/lib/infrastructure/cron/scheduler-manifest";
import {
  deriveSourceHealth,
  SOURCE_STATUS_LABEL,
  type DerivedSourceStatus,
} from "@/lib/news/ingestion/source-health";
import type { CronJobRow, OpsSnapshotRaw, SourceStateRow, Tone } from "@/lib/admin-ops/types";

const MIN = 60_000;

export const worst = (...tones: Tone[]): Tone =>
  tones.includes("critical") ? "critical" : tones.includes("warning") ? "warning" : "healthy";

export function ageMinutes(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.round((now - t) / MIN)) : null;
}

export function formatAge(minutes: number | null): string {
  if (minutes === null) return "never";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const h = Math.floor(minutes / 60);
  if (h < 48) return `${h}h ${minutes % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------------------------------------------------------------- freshness & pace

export function freshnessTone(lagMinutes: number | null): Tone {
  if (lagMinutes === null) return "critical";
  if (lagMinutes < 60) return "healthy";
  if (lagMinutes < 180) return "warning";
  return "critical";
}

export type PaceStatus = {
  expectedByNow: number;
  target: number;
  today: number;
  tone: Tone;
  message: "On pace" | "Below production pace" | "Publishing pipeline stalled";
  detail: string;
};

/** Minutes without a publish after which the pipeline is considered stalled. */
export const STALL_MINUTES = 180;

export function evaluatePace(input: {
  today: number;
  target: number;
  istHour: number;
  istMinute: number;
  lastPublishAgeMinutes: number | null;
}): PaceStatus {
  const elapsed = (input.istHour * 60 + input.istMinute) / (24 * 60);
  const expectedByNow = Math.floor(input.target * elapsed);
  const stalled = input.lastPublishAgeMinutes === null || input.lastPublishAgeMinutes >= STALL_MINUTES;
  if (stalled) {
    return {
      expectedByNow,
      target: input.target,
      today: input.today,
      tone: "critical",
      message: "Publishing pipeline stalled",
      detail:
        input.lastPublishAgeMinutes === null
          ? "no published story found"
          : `no story published for ${formatAge(input.lastPublishAgeMinutes).replace(" ago", "")}`,
    };
  }
  // Below 70% of the linear pace is below production pace. The expectation only becomes
  // meaningful once >= 10 stories are due (~2.4h into the IST day), so early hours never flag.
  const threshold = Math.floor(expectedByNow * 0.7);
  if (expectedByNow >= 10 && input.today < threshold) {
    return {
      expectedByNow,
      target: input.target,
      today: input.today,
      tone: input.today < expectedByNow * 0.4 ? "critical" : "warning",
      message: "Below production pace",
      detail: `${input.today} published vs ~${expectedByNow} expected by now`,
    };
  }
  return {
    expectedByNow,
    target: input.target,
    today: input.today,
    tone: "healthy",
    message: "On pace",
    detail: `${input.today} published vs ~${expectedByNow} expected by now`,
  };
}

// ---------------------------------------------------------------- cron / scheduler jobs

export type JobHealth = {
  id: string;
  label: string;
  critical: boolean;
  tone: Tone;
  everyMinutes: number;
  lastRunAt: string | null;
  lastRunAgeMinutes: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  runs24h: number;
  failures24h: number;
  lastDurationMs: number | null;
  message: string;
};

export function evaluateJobs(snapshot: OpsSnapshotRaw, now: number): JobHealth[] {
  const byOpsJob = new Map<string, CronJobRow>(snapshot.cron.jobs.map((j) => [j.job, j]));
  return SCHEDULER_JOBS.map((job) => {
    const row = byOpsJob.get(job.opsJob);
    const age = ageMinutes(row?.last_run_at, now);
    const stalled = age === null || age * MIN > stallThresholdMs(job);
    const failing = row ? row.last_ok === false : false;
    // 1 failure in the last 24 runs is noise; a failing LAST run or a >50% failure rate is not.
    const failureRate = row && row.runs_24h ? row.failures_24h / row.runs_24h : 0;
    let tone: Tone = "healthy";
    let message = row ? `${row.runs_24h} runs / 24h` : "no runs recorded in 24h";
    if (stalled) {
      tone = job.critical ? "critical" : "warning";
      message = age === null ? "no run in the last 24h" : `stalled — last run ${formatAge(age)}`;
    } else if (failing || failureRate > 0.5) {
      tone = job.critical ? "critical" : "warning";
      message = `last run failed${row?.last_error ? `: ${row.last_error}` : ""}`;
    } else if (failureRate > 0.15 || (row?.degraded_24h ?? 0) > (row?.runs_24h ?? 1) * 0.6) {
      tone = "warning";
      message = `${row!.failures_24h} failed / ${row!.degraded_24h} degraded of ${row!.runs_24h} runs`;
    }
    return {
      id: job.id,
      label: job.label,
      critical: job.critical,
      tone,
      everyMinutes: job.everyMinutes,
      lastRunAt: row?.last_run_at ?? null,
      lastRunAgeMinutes: age,
      lastSuccessAt: row?.last_success_at ?? null,
      lastFailureAt: row?.last_failure_at ?? null,
      runs24h: row?.runs_24h ?? 0,
      failures24h: row?.failures_24h ?? 0,
      lastDurationMs: row?.last_duration_ms ?? null,
      message,
    };
  });
}

// ---------------------------------------------------------------- sources

export type SourceRowView = {
  key: string;
  provider: string;
  status: DerivedSourceStatus;
  statusLabel: string;
  tone: Tone;
  reason: string;
  lastSuccessAt: string | null;
  lastNewItemAt: string | null;
  itemsToday: number;
  newItemsToday: number;
  duplicatesToday: number;
  failuresToday: number;
  consecutiveFailures: number;
  consecutiveEmptyRuns: number;
  quota: string;
};

const SOURCE_TONE: Record<DerivedSourceStatus, Tone> = {
  healthy: "healthy",
  degraded: "warning",
  dormant: "warning",
  rate_limited: "warning",
  failing: "critical",
  disabled: "warning",
  retired: "healthy", // retired is intentional, not an incident
  orphaned: "warning",
  never_run: "warning",
};

export function evaluateSources(
  snapshot: OpsSnapshotRaw,
  knownRssIds: ReadonlySet<string>,
  now: number
): SourceRowView[] {
  const today = new Map(snapshot.sources.today.map((s) => [s.source, s]));
  return snapshot.sources.state
    .map((s: SourceStateRow) => {
      const id = s.source_key.replace(/^rss:/, "");
      const known = s.provider_family === "rss" ? knownRssIds.has(id) : true;
      const d = deriveSourceHealth(s, { now, known });
      const t = today.get(id);
      const quota =
        s.quota_exhausted_until && new Date(s.quota_exhausted_until).getTime() > now
          ? `exhausted until ${s.quota_exhausted_until.slice(0, 16).replace("T", " ")}Z`
          : s.rate_limited_until && new Date(s.rate_limited_until).getTime() > now
            ? "rate limited"
            : "ok";
      return {
        key: s.source_key,
        provider: s.provider_family,
        status: d.status,
        statusLabel: SOURCE_STATUS_LABEL[d.status],
        tone: SOURCE_TONE[d.status],
        reason: d.reason,
        lastSuccessAt: s.last_successful_at,
        lastNewItemAt: s.last_new_item_at,
        itemsToday: t?.fetched ?? 0,
        newItemsToday: t?.new_items ?? 0,
        duplicatesToday: t?.duplicates ?? 0,
        failuresToday: t?.failures ?? 0,
        consecutiveFailures: s.consecutive_failures,
        consecutiveEmptyRuns: s.consecutive_empty_runs,
        quota,
      };
    })
    .sort((a, b) => {
      const rank = (t: Tone) => (t === "critical" ? 0 : t === "warning" ? 1 : 2);
      return rank(a.tone) - rank(b.tone) || b.newItemsToday - a.newItemsToday || a.key.localeCompare(b.key);
    });
}

// ---------------------------------------------------------------- geo coverage

export type DistrictCoverage = {
  slug: string;
  name: string;
  nameHi: string;
  tier: string;
  today: number;
  last7d: number;
  latestAt: string | null;
  ageHours: number | null;
  status: "covered" | "stale" | "none";
  tone: Tone;
};

export function evaluateDistrictCoverage(snapshot: OpsSnapshotRaw, now: number): DistrictCoverage[] {
  const bySlug = new Map(snapshot.geo.districts.map((d) => [d.district, d]));
  return CG_DISTRICTS.map((d) => {
    const row = bySlug.get(d.slug);
    const age = ageMinutes(row?.latest_at, now);
    const ageHours = age === null ? null : Math.round((age / 60) * 10) / 10;
    let status: DistrictCoverage["status"] = "covered";
    let tone: Tone = "healthy";
    if (!row || row.last_7d === 0) {
      status = "none";
      tone = d.tierLabel === "high" ? "critical" : "warning";
    } else if (ageHours !== null && ageHours > 48) {
      status = "stale";
      tone = "warning";
    }
    return {
      slug: d.slug,
      name: d.name,
      nameHi: d.nameHi,
      tier: d.tierLabel,
      today: row?.today ?? 0,
      last7d: row?.last_7d ?? 0,
      latestAt: row?.latest_at ?? null,
      ageHours,
      status,
      tone,
    };
  }).sort((a, b) => {
    const rank = (c: DistrictCoverage) => (c.status === "none" ? 0 : c.status === "stale" ? 1 : 2);
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });
}

export type GeoShares = {
  total: number;
  chhattisgarh: number;
  districtTagged: number;
  statewide: number;
  unknown: number;
  national: number;
  international: number;
  indiaRelevant: number;
  legacyUnclassified: number;
};

/** Collapse scope counts (stored scope + LEGACY_* / UNCLASSIFIED fallbacks) into share buckets. */
export function geoShares(scopes: Record<string, number>): GeoShares {
  const n = (k: string) => scopes[k] ?? 0;
  const district = n("DISTRICT_SPECIFIC");
  const statewide = n("STATEWIDE_CHHATTISGARH");
  const indiaRel = n("INDIA_RELEVANT_TO_CHHATTISGARH");
  const legacyDistrict = n("LEGACY_DISTRICT");
  const legacyState = n("LEGACY_STATEWIDE");
  const total = Object.values(scopes).reduce((a, b) => a + b, 0);
  return {
    total,
    chhattisgarh: district + statewide + indiaRel + legacyDistrict + legacyState,
    districtTagged: district + legacyDistrict,
    statewide: statewide + legacyState,
    unknown: n("UNKNOWN") + n("LEGACY_UNKNOWN") + n("UNCLASSIFIED"),
    national: n("NATIONAL") + n("LEGACY_NON_CG"),
    international: n("INTERNATIONAL"),
    indiaRelevant: indiaRel,
    legacyUnclassified: n("LEGACY_DISTRICT") + n("LEGACY_STATEWIDE") + n("LEGACY_NON_CG") + n("LEGACY_UNKNOWN") + n("UNCLASSIFIED"),
  };
}

// ---------------------------------------------------------------- subsystem panel

export type SubsystemStatus = {
  id: string;
  label: string;
  tone: Tone;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  reason: string;
};

export function evaluateSubsystems(
  snapshot: OpsSnapshotRaw,
  jobs: JobHealth[],
  sources: SourceRowView[],
  runtime: { redisConfigured: boolean; vercelEnv: string | null; vercelRegion: string | null; commitSha: string | null; snapshotLatencyMs: number },
  now: number
): SubsystemStatus[] {
  const job = (id: string) => jobs.find((j) => j.id === id);
  const fromJob = (id: string, label: string): SubsystemStatus => {
    const j = job(id);
    return {
      id,
      label,
      tone: j?.tone ?? "warning",
      lastSuccessAt: j?.lastSuccessAt ?? null,
      lastFailureAt: j?.lastFailureAt ?? null,
      reason: j?.message ?? "no data",
    };
  };

  const rss = sources.filter((s) => s.provider === "rss" && s.status !== "retired" && s.status !== "orphaned");
  const rssHealthy = rss.filter((s) => s.status === "healthy").length;
  const rssShare = rss.length ? rssHealthy / rss.length : 0;
  const rssTone: Tone = rssShare >= 0.5 ? "healthy" : rssShare >= 0.25 ? "warning" : "critical";
  const newsdata = sources.find((s) => s.provider === "newsdata");
  const gnews = sources.find((s) => s.provider === "gnews");

  const editorialUsage = snapshot.ai.usage_24h.filter((u) => u.operation === "editorial_generate");
  const okCalls = editorialUsage.reduce((a, u) => a + u.ok, 0);
  const allCalls = editorialUsage.reduce((a, u) => a + u.calls, 0);
  const openCircuits = snapshot.ai.circuit.filter((c) => c.disabled_until && new Date(c.disabled_until).getTime() > now);
  const aiRate = allCalls ? okCalls / allCalls : null;
  const aiTone: Tone = allCalls === 0 ? "warning" : aiRate! >= 0.6 ? "healthy" : aiRate! >= 0.3 ? "warning" : "critical";
  const lastAiSuccess = editorialUsage.map((u) => u.last_success_at).filter(Boolean).sort().pop() ?? null;
  const lastAiFailure = editorialUsage.map((u) => u.last_failure_at).filter(Boolean).sort().pop() ?? null;

  const deadTranslate = snapshot.queue.worker_jobs.filter((w) => w.job_type === "translate_article" && w.status === "dead").reduce((a, w) => a + w.n, 0);
  const translation = fromJob("translation-backfill", "Translation");
  if (deadTranslate > 0) translation.reason += ` · ${deadTranslate} dead translate jobs`;

  const withImg = snapshot.publishing.today_with_image ?? 0;
  const noImg = snapshot.publishing.today_without_image ?? 0;
  const imgShare = withImg + noImg ? withImg / (withImg + noImg) : null;

  const ingest = fromJob("fetch-news", "Ingestion");
  const dbLatencyTone: Tone = runtime.snapshotLatencyMs < 1500 ? "healthy" : runtime.snapshotLatencyMs < 4000 ? "warning" : "critical";
  const schedulerTone: Tone = !snapshot.pg_cron_installed
    ? "critical"
    : (snapshot.scheduler ?? []).some((s) => s.dispatch_errors > 0 && s.dispatched === s.dispatch_errors)
      ? "critical"
      : "healthy";

  return [
    { id: "database", label: "Database", tone: dbLatencyTone, lastSuccessAt: snapshot.generated_at, lastFailureAt: null, reason: `snapshot in ${runtime.snapshotLatencyMs}ms` },
    ingest,
    {
      id: "newsdata",
      label: "NewsData",
      tone: !newsdata ? "warning" : SOURCE_TONE[newsdata.status],
      lastSuccessAt: newsdata?.lastSuccessAt ?? null,
      lastFailureAt: null,
      reason: newsdata ? `${newsdata.statusLabel} — ${newsdata.reason}` : "no state recorded",
    },
    {
      id: "rss",
      label: "RSS",
      tone: rssTone,
      lastSuccessAt: rss.map((s) => s.lastSuccessAt).filter(Boolean).sort().pop() ?? null,
      lastFailureAt: null,
      reason: `${rssHealthy}/${rss.length} feeds producing new items`,
    },
    {
      id: "gnews",
      label: "GNews",
      tone: !gnews ? "warning" : gnews.status === "healthy" ? "healthy" : "warning",
      lastSuccessAt: gnews?.lastSuccessAt ?? null,
      lastFailureAt: null,
      reason: gnews ? `${gnews.statusLabel} — ${gnews.quota !== "ok" ? `quota ${gnews.quota}` : gnews.reason}` : "no state recorded",
    },
    {
      id: "editorial-ai",
      label: "Editorial AI",
      tone: worst(aiTone, openCircuits.length >= 2 ? "warning" : "healthy"),
      lastSuccessAt: lastAiSuccess,
      lastFailureAt: lastAiFailure,
      reason: allCalls
        ? `${okCalls}/${allCalls} calls ok (24h)${openCircuits.length ? ` · ${openCircuits.length} circuit(s) open` : ""}`
        : "no editorial AI calls in 24h",
    },
    translation,
    {
      id: "images",
      label: "Images",
      tone: imgShare === null ? "warning" : imgShare >= 0.6 ? "healthy" : imgShare >= 0.3 ? "warning" : "critical",
      lastSuccessAt: null,
      lastFailureAt: null,
      reason: imgShare === null ? "no articles published today" : `${Math.round(imgShare * 100)}% of today's stories have an image (${withImg}/${withImg + noImg})`,
    },
    {
      id: "caching",
      label: "Caching",
      tone: runtime.redisConfigured ? "healthy" : "warning",
      lastSuccessAt: null,
      lastFailureAt: null,
      reason: runtime.redisConfigured ? "Redis configured; ISR tag revalidation on publish" : "Redis not configured — memory fallback only",
    },
    {
      id: "cron",
      label: "Cron / scheduler",
      tone: worst(schedulerTone, ...jobs.filter((j) => j.critical).map((j) => j.tone)),
      lastSuccessAt: jobs.map((j) => j.lastSuccessAt).filter(Boolean).sort().pop() ?? null,
      lastFailureAt: jobs.map((j) => j.lastFailureAt).filter(Boolean).sort().pop() ?? null,
      reason: !snapshot.pg_cron_installed
        ? "pg_cron not installed — runs are coming from external schedulers (throttled)"
        : `${jobs.filter((j) => j.tone === "healthy").length}/${jobs.length} jobs healthy`,
    },
    {
      id: "vercel",
      label: "Vercel",
      tone: "healthy",
      lastSuccessAt: null,
      lastFailureAt: null,
      reason: `env ${runtime.vercelEnv ?? "local"} · region ${runtime.vercelRegion ?? "n/a"}${runtime.commitSha ? ` · ${runtime.commitSha.slice(0, 7)}` : ""}`,
    },
    { id: "supabase", label: "Supabase", tone: dbLatencyTone, lastSuccessAt: snapshot.generated_at, lastFailureAt: null, reason: "service-role RPC reachable" },
  ];
}

/** Bucket a raw skip/failure reason into the failure-center categories. */
export type FailureCategory =
  | "provider_quota"
  | "provider_timeout"
  | "quality_rejection"
  | "duplicate"
  | "stale_source"
  | "missing_geography"
  | "image_failure"
  | "translation_failure"
  | "database_error"
  | "provider_error"
  | "other";

export function categorizeFailure(reason: string): FailureCategory {
  const r = reason.toLowerCase();
  if (/quota|429|rate.?limit|deferred_quota/.test(r)) return "provider_quota";
  if (/timeout|timed out|abort/.test(r)) return "provider_timeout";
  if (/llm_generation_failed|ai_(http|upstream|unauthorized|invalid)|provider_config|no_ai_provider/.test(r)) return "provider_error";
  if (/duplicate|already_exists|similar/.test(r)) return "duplicate";
  if (/stale|older_than|too_old/.test(r)) return "stale_source";
  if (/geo|geography|unproven_cg|unknown_scope/.test(r)) return "missing_geography";
  if (/image|media/.test(r)) return "image_failure";
  if (/translat/.test(r)) return "translation_failure";
  if (/database|supabase|postgres|constraint|violates/.test(r)) return "database_error";
  if (/quality|validation|script_mismatch|headline:|fact_pack|unsupported|insufficient|reject/.test(r)) return "quality_rejection";
  return "other";
}

export const FAILURE_CATEGORY_LABEL: Record<FailureCategory, string> = {
  provider_quota: "Provider quota",
  provider_timeout: "Provider timeout",
  provider_error: "Provider / model error",
  quality_rejection: "Quality rejection",
  duplicate: "Duplicate",
  stale_source: "Stale source",
  missing_geography: "Missing geography",
  image_failure: "Image failure",
  translation_failure: "Translation failure",
  database_error: "Database error",
  other: "Other",
};
