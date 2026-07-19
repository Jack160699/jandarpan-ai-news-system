/**
 * Phase 3 — safe editorial backlog recovery (dry-run default).
 *
 * Never deletes queue rows. Quarantine annotates + parks jobs.
 * Retries only after evidence checks (tenant, duplicates, uncovered events).
 */

import {
  classifyBacklogJob,
  classifyDeadLetterEntry,
  selectRecoveryBatch,
  shouldStopOnErrors,
} from "@/lib/ops/editorial-backlog-classify";
import {
  RECOVERY_RATE_LIMITS,
  type BacklogClass,
  type BacklogClassification,
  type BacklogClassificationContext,
  type BacklogJobSnapshot,
  type BatchVerification,
  type DlqClassification,
  type RecoveryAuditEntry,
} from "@/lib/ops/editorial-backlog-types";
import { enqueueJob, reclaimStaleClaimedJobs } from "@/lib/infrastructure/jobs/queue";
import type { JobType } from "@/lib/infrastructure/jobs/types";
import { createAdminServerClient } from "@/lib/supabase";

const GENERATION_JOB_TYPES: JobType[] = ["editorial_generate"];
const UPSTREAM_JOB_TYPES: JobType[] = [
  "editorial_generate",
  "event_cluster",
  "embed_signals",
  "intelligence_snapshot",
  "intelligence_cluster",
  "analytics_aggregate",
  "translate_article",
];

export type RecoveryCommand =
  | "audit"
  | "retry"
  | "release-stale-claims"
  | "quarantine"
  | "list-obsolete"
  | "verify"
  | "classify-dlq";

export type RecoveryRunOptions = {
  dryRun?: boolean;
  command?: RecoveryCommand;
  batchSize?: number;
  tenantId?: string | null;
  jobTypes?: string[];
  /** Min age in hours (filter jobs older than this) */
  minAgeHours?: number;
  /** Max age in hours */
  maxAgeHours?: number;
  classes?: BacklogClass[];
  reasonContains?: string;
  stopOnErrorThreshold?: number;
  /** When true, enqueue a fresh bounded wake-up instead of only resetting rows */
  enqueueWakeup?: boolean;
};

export type RecoveryRunResult = {
  dryRun: boolean;
  command: RecoveryCommand;
  examined: number;
  byClass: Record<string, number>;
  classifications: BacklogClassification[];
  selected: BacklogClassification[];
  actionsAttempted: number;
  actionsSucceeded: number;
  actionsFailed: number;
  stoppedOnError: boolean;
  audit: RecoveryAuditEntry[];
  dlq?: DlqClassification[];
  verification?: BatchVerification;
  summary: string;
};

function asPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function rowToSnapshot(row: {
  id: string;
  job_type: string;
  status: string;
  tenant_id: string | null;
  dedupe_key: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  claimed_at: string | null;
  scheduled_at: string;
  created_at: string;
  result: unknown;
}): BacklogJobSnapshot {
  return {
    id: row.id,
    jobType: row.job_type,
    status: row.status as BacklogJobSnapshot["status"],
    tenantId: row.tenant_id,
    dedupeKey: row.dedupe_key,
    payload: asPayload(row.payload),
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lastError: row.last_error,
    claimedAt: row.claimed_at,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    result: asPayload(row.result),
  };
}

async function countPending(jobType: string, tenantId?: string | null): Promise<number> {
  const supabase = createAdminServerClient();
  let q = supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .eq("job_type", jobType)
    .eq("status", "pending");
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { count } = await q;
  return count ?? 0;
}

async function oldestPendingAgeMs(
  jobType: string,
  tenantId?: string | null
): Promise<number | null> {
  const supabase = createAdminServerClient();
  let q = supabase
    .from("worker_jobs")
    .select("scheduled_at, created_at")
    .eq("job_type", jobType)
    .eq("status", "pending")
    .order("scheduled_at", { ascending: true })
    .limit(1);
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  const ts = Date.parse(data.scheduled_at ?? data.created_at);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Date.now() - ts);
}

async function tenantExists(tenantId: string | null): Promise<boolean | null> {
  if (!tenantId) return null;
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("newsroom_tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();
  return Boolean(data?.id);
}

async function hasActiveDuplicate(
  jobType: string,
  dedupeKey: string,
  excludeId: string
): Promise<boolean> {
  const supabase = createAdminServerClient();
  const { count } = await supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .eq("job_type", jobType)
    .eq("dedupe_key", dedupeKey)
    .in("status", ["pending", "claimed"])
    .neq("id", excludeId);
  return (count ?? 0) > 0;
}

async function loadUncoveredEventStats(
  tenantId: string | null,
  autoPublishMaxAgeHours: number
): Promise<{
  uncovered: number;
  fresh: number;
  stale: number;
}> {
  const supabase = createAdminServerClient();
  let eventsQuery = supabase
    .from("news_events")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(400);
  if (tenantId) eventsQuery = eventsQuery.eq("tenant_id", tenantId);

  const { data: events } = await eventsQuery;
  if (!events?.length) return { uncovered: 0, fresh: 0, stale: 0 };

  const { data: articles } = await supabase
    .from("generated_articles")
    .select("event_id")
    .not("event_id", "is", null)
    .limit(5000);

  const used = new Set(
    (articles ?? [])
      .map((a) => a.event_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );

  const cutoff = Date.now() - autoPublishMaxAgeHours * 3_600_000;
  let uncovered = 0;
  let fresh = 0;
  let stale = 0;

  for (const ev of events) {
    if (used.has(ev.id)) continue;
    uncovered += 1;
    const seen = Date.parse(ev.created_at);
    if (Number.isFinite(seen) && seen >= cutoff) fresh += 1;
    else stale += 1;
  }

  return { uncovered, fresh, stale };
}

async function payloadEventChecks(payload: Record<string, unknown>): Promise<{
  exists: boolean | null;
  alreadyGenerated: boolean;
  sourceExists: boolean | null;
}> {
  const supabase = createAdminServerClient();
  const eventIdRaw = payload.eventId ?? payload.event_id;
  const eventId =
    typeof eventIdRaw === "string" && eventIdRaw.trim() ? eventIdRaw.trim() : null;

  let exists: boolean | null = null;
  let alreadyGenerated = false;
  if (eventId) {
    const { data: ev } = await supabase
      .from("news_events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();
    exists = Boolean(ev?.id);
    const { data: art } = await supabase
      .from("generated_articles")
      .select("id")
      .eq("event_id", eventId)
      .limit(1)
      .maybeSingle();
    alreadyGenerated = Boolean(art?.id);
  }

  const sourceId =
    typeof payload.sourceEventId === "string" && payload.sourceEventId.trim()
      ? payload.sourceEventId.trim()
      : null;
  let sourceExists: boolean | null = null;
  if (sourceId) {
    const { data: src } = await supabase
      .from("event_bus_messages")
      .select("id")
      .eq("id", sourceId)
      .maybeSingle();
    sourceExists = Boolean(src?.id);
  }

  return { exists, alreadyGenerated, sourceExists };
}

async function buildContextForJob(
  job: BacklogJobSnapshot,
  shared: {
    eventClusterPending: number;
    embedSignalsPending: number;
    uncovered: number;
    fresh: number;
    stale: number;
  }
): Promise<BacklogClassificationContext> {
  const [tenantOk, dup, eventChecks] = await Promise.all([
    tenantExists(job.tenantId),
    hasActiveDuplicate(job.jobType, job.dedupeKey, job.id),
    payloadEventChecks(job.payload),
  ]);

  return {
    nowMs: Date.now(),
    staleClaimMs: RECOVERY_RATE_LIMITS.staleClaimMs,
    autoPublishMaxAgeHours: RECOVERY_RATE_LIMITS.autoPublishMaxAgeHours,
    obsoleteJobMaxAgeHours: RECOVERY_RATE_LIMITS.obsoleteJobMaxAgeHours,
    dependencyPendingThreshold: RECOVERY_RATE_LIMITS.dependencyPendingThreshold,
    tenantExists: tenantOk,
    hasActiveDuplicate: dup,
    uncoveredEventCount: shared.uncovered,
    freshUncoveredEventCount: shared.fresh,
    staleUncoveredEventCount: shared.stale,
    eventClusterPending: shared.eventClusterPending,
    embedSignalsPending: shared.embedSignalsPending,
    payloadEventExists: eventChecks.exists,
    payloadEventAlreadyGenerated: eventChecks.alreadyGenerated,
    sourceEventExists: eventChecks.sourceExists,
    alreadyQuarantined: job.result?.quarantined === true,
  };
}

async function loadCandidateJobs(options: RecoveryRunOptions): Promise<BacklogJobSnapshot[]> {
  const supabase = createAdminServerClient();
  const jobTypes = options.jobTypes?.length
    ? options.jobTypes
    : UPSTREAM_JOB_TYPES;
  const limit = Math.max(options.batchSize ?? 50, 50);

  let q = supabase
    .from("worker_jobs")
    .select(
      "id, job_type, status, tenant_id, dedupe_key, payload, attempts, max_attempts, last_error, claimed_at, scheduled_at, created_at, result"
    )
    .in("job_type", jobTypes)
    .in("status", ["pending", "claimed", "failed", "dead"])
    .order("created_at", { ascending: true })
    .limit(Math.min(limit, 200));

  if (options.tenantId) q = q.eq("tenant_id", options.tenantId);

  const { data, error } = await q;
  if (error) throw new Error(`backlog_load_failed:${error.message}`);

  let rows = (data ?? []).map(rowToSnapshot);
  const now = Date.now();

  if (options.minAgeHours != null) {
    const minMs = options.minAgeHours * 3_600_000;
    rows = rows.filter((r) => now - Date.parse(r.createdAt) >= minMs);
  }
  if (options.maxAgeHours != null) {
    const maxMs = options.maxAgeHours * 3_600_000;
    rows = rows.filter((r) => now - Date.parse(r.createdAt) <= maxMs);
  }
  if (options.reasonContains) {
    const needle = options.reasonContains.toLowerCase();
    rows = rows.filter((r) => (r.lastError ?? "").toLowerCase().includes(needle));
  }

  return rows;
}

async function quarantineJob(
  jobId: string,
  classification: BacklogClassification,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) return true;
  const supabase = createAdminServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("worker_jobs")
    .update({
      status: "failed",
      claimed_at: null,
      last_error: `[quarantined] ${classification.class}: ${classification.reasons.join(",")}`,
      result: {
        quarantined: true,
        phase: "phase3_backlog_recovery",
        class: classification.class,
        reasons: classification.reasons,
        quarantinedAt: now,
      },
      scheduled_at: new Date(Date.now() + 365 * 24 * 3_600_000).toISOString(),
      updated_at: now,
    })
    .eq("id", jobId)
    .in("status", ["pending", "claimed", "failed", "dead"]);

  return !error;
}

async function markManualReview(
  jobId: string,
  classification: BacklogClassification,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) return true;
  const supabase = createAdminServerClient();
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("worker_jobs")
    .select("result")
    .eq("id", jobId)
    .maybeSingle();
  const prev = asPayload(existing?.result);
  const { error } = await supabase
    .from("worker_jobs")
    .update({
      result: {
        ...prev,
        manualReviewRequired: true,
        phase: "phase3_backlog_recovery",
        class: classification.class,
        reasons: classification.reasons,
        markedAt: now,
      },
      last_error: `[manual_review] ${classification.reasons.join(",")}`,
      updated_at: now,
    })
    .eq("id", jobId);

  return !error;
}

async function retryJob(
  job: BacklogJobSnapshot,
  dryRun: boolean,
  enqueueWakeup: boolean
): Promise<boolean> {
  if (dryRun) return true;
  const supabase = createAdminServerClient();
  const now = new Date().toISOString();

  if (enqueueWakeup && job.jobType === "editorial_generate") {
    const id = await enqueueJob({
      jobType: "editorial_generate",
      dedupeKey: `editorial_generate:recovery:${job.tenantId ?? "global"}:${Date.now()}`,
      tenantId: job.tenantId,
      payload: {
        limit: RECOVERY_RATE_LIMITS.maxArticlesPerWakeup,
        recovery: true,
        phase: "phase3_backlog_recovery",
        sourceJobId: job.id,
      },
      priority: 8,
      timeoutMs: 90_000,
    });
    if (!id) return false;
  }

  const { error } = await supabase
    .from("worker_jobs")
    .update({
      status: "pending",
      claimed_at: null,
      last_error: null,
      scheduled_at: now,
      updated_at: now,
      result: {
        ...asPayload(job.result),
        recoveryRetryAt: now,
        phase: "phase3_backlog_recovery",
      },
    })
    .eq("id", job.id)
    .in("status", ["pending", "claimed", "failed"]);

  return !error;
}

async function releaseStaleClaim(jobId: string, dryRun: boolean): Promise<boolean> {
  if (dryRun) return true;
  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("worker_jobs")
    .update({
      status: "pending",
      claimed_at: null,
      last_error: "[reclaimed stale claim] phase3_recovery",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "claimed");
  return !error;
}

async function annotateDlq(
  classification: DlqClassification,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) return true;
  const supabase = createAdminServerClient();
  const { data: row } = await supabase
    .from("worker_dead_letters")
    .select("metadata")
    .eq("id", classification.id)
    .maybeSingle();
  const prev = asPayload(row?.metadata);
  const { error } = await supabase
    .from("worker_dead_letters")
    .update({
      metadata: {
        ...prev,
        phase3: {
          resolution: classification.resolution,
          reasons: classification.reasons,
          classifiedAt: new Date().toISOString(),
          deleted: false,
        },
      },
    })
    .eq("id", classification.id);
  return !error;
}

export async function verifyRecoveryBatch(options?: {
  tenantId?: string | null;
  before?: { depth: number; oldestAgeMs: number | null };
  sinceIso?: string;
}): Promise<BatchVerification> {
  const tenantId = options?.tenantId ?? null;
  const sinceIso =
    options?.sinceIso ?? new Date(Date.now() - 30 * 60_000).toISOString();
  const supabase = createAdminServerClient();

  const [depthAfter, oldestAfter, completedRes, articlesRes, failRes] =
    await Promise.all([
      countPending("editorial_generate", tenantId),
      oldestPendingAgeMs("editorial_generate", tenantId),
      supabase
        .from("worker_jobs")
        .select("id", { count: "exact", head: true })
        .eq("job_type", "editorial_generate")
        .eq("status", "completed")
        .gte("completed_at", sinceIso),
      supabase
        .from("generated_articles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso),
      supabase
        .from("worker_job_runs")
        .select("id", { count: "exact", head: true })
        .eq("job_type", "editorial_generate")
        .eq("ok", false)
        .gte("created_at", sinceIso),
    ]);

  const jobsCompleted = completedRes.count ?? 0;
  const generatedArticlesCreated = articlesRes.count ?? 0;
  const recentFails = failRes.count ?? 0;
  const depthBefore = options?.before?.depth ?? depthAfter;
  const oldestBefore = options?.before?.oldestAgeMs ?? oldestAfter;

  const notes: string[] = [];
  const recentFailureSpike = recentFails >= 5;
  const publicationFlood = generatedArticlesCreated > 20;
  if (recentFailureSpike) notes.push("recent_failure_spike");
  if (publicationFlood) notes.push("publication_flood_risk");
  if (depthAfter > depthBefore) notes.push("queue_depth_increased");
  if (
    oldestBefore != null &&
    oldestAfter != null &&
    oldestAfter > oldestBefore
  ) {
    notes.push("oldest_age_worsened");
  }

  return {
    jobsClaimed: 0,
    jobsCompleted,
    generatedArticlesCreated,
    duplicatesAvoided: 0,
    queueDepthBefore: depthBefore,
    queueDepthAfter: depthAfter,
    oldestPendingAgeMsBefore: oldestBefore,
    oldestPendingAgeMsAfter: oldestAfter,
    recentFailureSpike,
    publicationFlood,
    ok: !recentFailureSpike && !publicationFlood,
    notes,
  };
}

export async function runEditorialBacklogRecovery(
  options: RecoveryRunOptions = {}
): Promise<RecoveryRunResult> {
  const dryRun = options.dryRun ?? true;
  const command: RecoveryCommand = options.command ?? "audit";
  const stopThreshold =
    options.stopOnErrorThreshold ?? RECOVERY_RATE_LIMITS.stopOnErrorThreshold;
  const audit: RecoveryAuditEntry[] = [];
  const byClass: Record<string, number> = {};

  if (command === "verify") {
    const verification = await verifyRecoveryBatch({
      tenantId: options.tenantId,
    });
    return {
      dryRun,
      command,
      examined: 0,
      byClass: {},
      classifications: [],
      selected: [],
      actionsAttempted: 0,
      actionsSucceeded: 0,
      actionsFailed: 0,
      stoppedOnError: false,
      audit,
      verification,
      summary: verification.ok
        ? "verification_ok"
        : `verification_flags:${verification.notes.join(",")}`,
    };
  }

  if (command === "classify-dlq") {
    const supabase = createAdminServerClient();
    const { data: rows, error } = await supabase
      .from("worker_dead_letters")
      .select("id, job_type, dedupe_key, last_error, metadata")
      .order("failed_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(`dlq_load_failed:${error.message}`);

    const dlq: DlqClassification[] = [];
    let actionsAttempted = 0;
    let actionsSucceeded = 0;
    let actionsFailed = 0;
    let consecutiveErrors = 0;
    let stoppedOnError = false;

    for (const row of rows ?? []) {
      const dup = await hasActiveDuplicate(
        row.job_type,
        row.dedupe_key,
        "00000000-0000-0000-0000-000000000000"
      );
      const c = classifyDeadLetterEntry({
        id: row.id,
        jobType: row.job_type,
        lastError: row.last_error,
        hasActiveDuplicate: dup,
      });
      dlq.push(c);
      byClass[c.resolution] = (byClass[c.resolution] ?? 0) + 1;

      if (!dryRun) {
        actionsAttempted += 1;
        const ok = await annotateDlq(c, false);
        if (ok) {
          actionsSucceeded += 1;
          consecutiveErrors = 0;
        } else {
          actionsFailed += 1;
          consecutiveErrors += 1;
        }
        audit.push({
          at: new Date().toISOString(),
          dryRun,
          command,
          jobId: c.id,
          jobType: c.jobType,
          class: c.resolution,
          action: c.action,
          ok,
          detail: c.reasons.join(","),
        });
        if (shouldStopOnErrors(consecutiveErrors, stopThreshold)) {
          stoppedOnError = true;
          break;
        }
      } else {
        audit.push({
          at: new Date().toISOString(),
          dryRun: true,
          command,
          jobId: c.id,
          jobType: c.jobType,
          class: c.resolution,
          action: c.action,
          ok: true,
          detail: c.reasons.join(","),
        });
      }
    }

    return {
      dryRun,
      command,
      examined: dlq.length,
      byClass,
      classifications: [],
      selected: [],
      actionsAttempted,
      actionsSucceeded,
      actionsFailed,
      stoppedOnError,
      audit,
      dlq,
      summary: `dlq_classified=${dlq.length} dryRun=${dryRun}`,
    };
  }

  if (command === "release-stale-claims" && !dryRun) {
    const n = await reclaimStaleClaimedJobs(RECOVERY_RATE_LIMITS.staleClaimMs);
    return {
      dryRun,
      command,
      examined: n,
      byClass: { stale_claim: n },
      classifications: [],
      selected: [],
      actionsAttempted: 1,
      actionsSucceeded: n >= 0 ? 1 : 0,
      actionsFailed: 0,
      stoppedOnError: false,
      audit: [
        {
          at: new Date().toISOString(),
          dryRun,
          command,
          jobId: "*",
          jobType: "editorial_generate",
          class: "stale_claim",
          action: "release_stale_claim",
          ok: true,
          detail: `reclaimed=${n}`,
        },
      ],
      summary: `reclaimed_stale_claims=${n}`,
    };
  }

  const jobs = await loadCandidateJobs(options);
  const [eventClusterPending, embedSignalsPending, uncoveredStats] =
    await Promise.all([
      countPending("event_cluster", options.tenantId),
      countPending("embed_signals", options.tenantId),
      loadUncoveredEventStats(
        options.tenantId ?? null,
        RECOVERY_RATE_LIMITS.autoPublishMaxAgeHours
      ),
    ]);

  const shared = {
    eventClusterPending,
    embedSignalsPending,
    uncovered: uncoveredStats.uncovered,
    fresh: uncoveredStats.fresh,
    stale: uncoveredStats.stale,
  };

  const classifications: BacklogClassification[] = [];
  for (const job of jobs) {
    const ctx = await buildContextForJob(job, shared);
    const c = classifyBacklogJob(job, ctx);
    classifications.push(c);
    byClass[c.class] = (byClass[c.class] ?? 0) + 1;
  }

  if (command === "audit" || command === "list-obsolete") {
    const list =
      command === "list-obsolete"
        ? classifications.filter(
            (c) =>
              c.class === "obsolete" ||
              c.class === "malformed" ||
              c.class === "duplicate" ||
              c.class === "already_completed"
          )
        : classifications;

    return {
      dryRun: true,
      command,
      examined: jobs.length,
      byClass,
      classifications: list,
      selected: [],
      actionsAttempted: 0,
      actionsSucceeded: 0,
      actionsFailed: 0,
      stoppedOnError: false,
      audit: list.map((c) => ({
        at: new Date().toISOString(),
        dryRun: true,
        command,
        jobId: c.jobId,
        jobType: c.jobType,
        class: c.class,
        action: c.action,
        ok: true,
        detail: c.reasons.join(","),
      })),
      summary: `examined=${jobs.length} classes=${JSON.stringify(byClass)}`,
    };
  }

  const depthBefore = await countPending(
    "editorial_generate",
    options.tenantId
  );
  const oldestBefore = await oldestPendingAgeMs(
    "editorial_generate",
    options.tenantId
  );

  let selected: BacklogClassification[] = [];
  if (command === "retry") {
    selected = selectRecoveryBatch(classifications, {
      batchSize: options.batchSize ?? RECOVERY_RATE_LIMITS.maxGenerateWakeupsPerBatch,
      classes: options.classes ?? ["eligible_immediate_retry"],
      onlySafeAutoPublish: true,
    });
  } else if (command === "release-stale-claims") {
    selected = classifications
      .filter((c) => c.class === "stale_claim")
      .slice(0, options.batchSize ?? RECOVERY_RATE_LIMITS.maxJobsPerBatch);
  } else if (command === "quarantine") {
    const quarantineClasses = new Set(
      options.classes ?? [
        "obsolete",
        "malformed",
        "duplicate",
        "already_completed",
        "missing_source_record",
      ]
    );
    selected = classifications
      .filter((c) => quarantineClasses.has(c.class))
      .slice(0, options.batchSize ?? RECOVERY_RATE_LIMITS.maxJobsPerBatch);
  }

  let actionsAttempted = 0;
  let actionsSucceeded = 0;
  let actionsFailed = 0;
  let consecutiveErrors = 0;
  let stoppedOnError = false;

  const jobById = new Map(jobs.map((j) => [j.id, j]));

  for (const c of selected) {
    const job = jobById.get(c.jobId);
    if (!job) continue;

    actionsAttempted += 1;
    let ok = false;
    let detail = c.reasons.join(",");

    try {
      if (c.action === "retry") {
        // Guard: never blind requeue
        if (
          c.class !== "eligible_immediate_retry" ||
          !c.safeToAutoPublish ||
          c.evidence.freshUncoveredEventCount <= 0
        ) {
          ok = false;
          detail = "guard_rejected_unsafe_retry";
        } else {
          ok = await retryJob(job, dryRun, options.enqueueWakeup === true);
        }
      } else if (c.action === "release_stale_claim") {
        ok = await releaseStaleClaim(job.id, dryRun);
      } else if (c.action === "quarantine") {
        ok = await quarantineJob(job.id, c, dryRun);
      } else if (c.action === "mark_manual_review") {
        ok = await markManualReview(job.id, c, dryRun);
      } else {
        ok = true;
        detail = "no_op";
      }
    } catch (err) {
      ok = false;
      detail = err instanceof Error ? err.message : "action_error";
    }

    audit.push({
      at: new Date().toISOString(),
      dryRun,
      command,
      jobId: c.jobId,
      jobType: c.jobType,
      class: c.class,
      action: c.action,
      ok,
      detail,
    });

    if (ok) {
      actionsSucceeded += 1;
      consecutiveErrors = 0;
    } else {
      actionsFailed += 1;
      consecutiveErrors += 1;
      if (shouldStopOnErrors(consecutiveErrors, stopThreshold)) {
        stoppedOnError = true;
        break;
      }
    }
  }

  // Also mark manual-review rows when quarantining stale stories in same pass
  if (command === "quarantine") {
    const reviews = classifications
      .filter((c) => c.class === "manual_review_required")
      .slice(0, RECOVERY_RATE_LIMITS.maxJobsPerBatch);
    for (const c of reviews) {
      actionsAttempted += 1;
      const ok = await markManualReview(c.jobId, c, dryRun);
      audit.push({
        at: new Date().toISOString(),
        dryRun,
        command,
        jobId: c.jobId,
        jobType: c.jobType,
        class: c.class,
        action: "mark_manual_review",
        ok,
        detail: c.reasons.join(","),
      });
      if (ok) actionsSucceeded += 1;
      else actionsFailed += 1;
    }
  }

  const verification = await verifyRecoveryBatch({
    tenantId: options.tenantId,
    before: { depth: depthBefore, oldestAgeMs: oldestBefore },
  });

  return {
    dryRun,
    command,
    examined: jobs.length,
    byClass,
    classifications,
    selected,
    actionsAttempted,
    actionsSucceeded,
    actionsFailed,
    stoppedOnError,
    audit,
    verification,
    summary: [
      `command=${command}`,
      `dryRun=${dryRun}`,
      `examined=${jobs.length}`,
      `selected=${selected.length}`,
      `ok=${actionsSucceeded}`,
      `fail=${actionsFailed}`,
      `stopped=${stoppedOnError}`,
      `freshUncovered=${shared.fresh}`,
      `staleUncovered=${shared.stale}`,
    ].join(" "),
  };
}

export { GENERATION_JOB_TYPES, UPSTREAM_JOB_TYPES };
