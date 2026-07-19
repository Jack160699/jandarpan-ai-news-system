/**
 * Pure backlog / DLQ classifiers — no I/O.
 * Prefer evidence (downstream articles, tenants, duplicates) over age alone.
 */

import {
  RECOVERY_RATE_LIMITS,
  type BacklogClassification,
  type BacklogClassificationContext,
  type BacklogClass,
  type BacklogJobSnapshot,
  type DlqClassification,
  type DlqResolution,
  type RecoveryAction,
} from "@/lib/ops/editorial-backlog-types";

function hoursBetween(earlierIso: string, nowMs: number): number {
  const t = Date.parse(earlierIso);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return (nowMs - t) / 3_600_000;
}

function isQuarantined(job: BacklogJobSnapshot): boolean {
  if (job.result?.quarantined === true) return true;
  const err = job.lastError ?? "";
  return err.startsWith("[quarantined]");
}

function payloadEventId(payload: Record<string, unknown>): string | null {
  const raw = payload.eventId ?? payload.event_id;
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return id || null;
}

function defaultAction(cls: BacklogClass): RecoveryAction {
  switch (cls) {
    case "eligible_immediate_retry":
      return "retry";
    case "stale_claim":
      return "release_stale_claim";
    case "duplicate":
    case "obsolete":
    case "malformed":
    case "already_completed":
    case "missing_source_record":
      return "quarantine";
    case "missing_tenant":
    case "manual_review_required":
      return "mark_manual_review";
    case "eligible_after_dependency_recovery":
      return "none";
    case "dead_letter_candidate":
      return "annotate_dlq";
    default:
      return "none";
  }
}

function classify(
  job: BacklogJobSnapshot,
  cls: BacklogClass,
  reasons: string[],
  ctx: BacklogClassificationContext,
  safeToAutoPublish: boolean
): BacklogClassification {
  return {
    jobId: job.id,
    jobType: job.jobType,
    status: job.status,
    class: cls,
    action: defaultAction(cls),
    reasons,
    safeToAutoPublish,
    evidence: {
      uncoveredEventCount: ctx.uncoveredEventCount,
      freshUncoveredEventCount: ctx.freshUncoveredEventCount,
      staleUncoveredEventCount: ctx.staleUncoveredEventCount,
      hasActiveDuplicate: ctx.hasActiveDuplicate,
      lastError: job.lastError,
    },
  };
}

/**
 * Classify a single pending/failed/claimed/dead worker job.
 * Order is intentional: structural problems before usefulness.
 */
export function classifyBacklogJob(
  job: BacklogJobSnapshot,
  ctx: BacklogClassificationContext
): BacklogClassification {
  const reasons: string[] = [];

  if (ctx.alreadyQuarantined || isQuarantined(job)) {
    return classify(job, "obsolete", ["already_quarantined"], ctx, false);
  }

  if (!job.payload || typeof job.payload !== "object" || Array.isArray(job.payload)) {
    return classify(job, "malformed", ["payload_not_object"], ctx, false);
  }

  if (job.tenantId && ctx.tenantExists === false) {
    return classify(job, "missing_tenant", ["tenant_row_missing"], ctx, false);
  }

  if (
    job.status === "claimed" &&
    job.claimedAt &&
    Date.parse(job.claimedAt) <= ctx.nowMs - ctx.staleClaimMs
  ) {
    reasons.push("claim_lease_expired");
    return classify(job, "stale_claim", reasons, ctx, false);
  }

  if (ctx.hasActiveDuplicate && (job.status === "pending" || job.status === "failed")) {
    return classify(job, "duplicate", ["active_sibling_same_dedupe"], ctx, false);
  }

  if (job.status === "completed") {
    return classify(job, "already_completed", ["job_status_completed"], ctx, false);
  }

  const eventId = payloadEventId(job.payload);
  if (eventId) {
    if (ctx.payloadEventAlreadyGenerated) {
      return classify(
        job,
        "already_completed",
        ["generated_article_exists_for_event"],
        ctx,
        false
      );
    }
    if (ctx.payloadEventExists === false) {
      return classify(
        job,
        "missing_source_record",
        ["news_event_missing"],
        ctx,
        false
      );
    }
  }

  if (
    typeof job.payload.sourceEventId === "string" &&
    job.payload.sourceEventId.trim() &&
    ctx.sourceEventExists === false
  ) {
    // Bus message missing is soft for wake-ups — still useful if uncovered events remain.
    reasons.push("source_event_bus_message_missing");
  }

  if (job.status === "dead") {
    reasons.push("status_dead");
    return classify(job, "dead_letter_candidate", reasons, ctx, false);
  }

  const jobAgeHours = hoursBetween(job.createdAt, ctx.nowMs);
  const isEditorial = job.jobType === "editorial_generate";

  if (isEditorial) {
    if (ctx.uncoveredEventCount === 0) {
      return classify(
        job,
        "already_completed",
        ["no_uncovered_news_events", ...reasons],
        ctx,
        false
      );
    }

    if (
      ctx.freshUncoveredEventCount === 0 &&
      ctx.staleUncoveredEventCount > 0
    ) {
      return classify(
        job,
        "manual_review_required",
        [
          "only_stale_uncovered_events",
          `auto_publish_max_age_hours=${ctx.autoPublishMaxAgeHours}`,
          ...reasons,
        ],
        ctx,
        false
      );
    }

    const depsBlocked =
      ctx.eventClusterPending >= ctx.dependencyPendingThreshold ||
      ctx.embedSignalsPending >= ctx.dependencyPendingThreshold;

    if (depsBlocked && ctx.freshUncoveredEventCount === 0) {
      return classify(
        job,
        "eligible_after_dependency_recovery",
        [
          `event_cluster_pending=${ctx.eventClusterPending}`,
          `embed_signals_pending=${ctx.embedSignalsPending}`,
          ...reasons,
        ],
        ctx,
        false
      );
    }

    if (
      jobAgeHours >= ctx.obsoleteJobMaxAgeHours &&
      ctx.freshUncoveredEventCount === 0
    ) {
      return classify(
        job,
        "obsolete",
        [`job_age_hours=${jobAgeHours.toFixed(1)}`, ...reasons],
        ctx,
        false
      );
    }

    const timeoutLike = (job.lastError ?? "").toLowerCase().includes("timeout");
    if (
      job.status === "pending" ||
      job.status === "failed" ||
      timeoutLike
    ) {
      reasons.push(
        timeoutLike ? "prior_job_timeout" : "pending_or_failed_wakeup"
      );
      reasons.push(`fresh_uncovered=${ctx.freshUncoveredEventCount}`);
      return classify(
        job,
        "eligible_immediate_retry",
        reasons,
        ctx,
        ctx.freshUncoveredEventCount > 0
      );
    }
  }

  // Non-editorial upstream jobs in the recovery audit scope
  if (
    job.status === "pending" ||
    job.status === "failed"
  ) {
    if (jobAgeHours >= ctx.obsoleteJobMaxAgeHours) {
      return classify(
        job,
        "obsolete",
        [`job_age_hours=${jobAgeHours.toFixed(1)}`],
        ctx,
        false
      );
    }
    reasons.push("upstream_pending");
    return classify(
      job,
      "eligible_after_dependency_recovery",
      reasons,
      ctx,
      false
    );
  }

  return classify(job, "manual_review_required", ["unclassified"], ctx, false);
}

export function classifyDeadLetterEntry(input: {
  id: string;
  jobType: string;
  lastError: string | null;
  hasActiveDuplicate: boolean;
  architectureFixedJobTypes?: string[];
}): DlqClassification {
  const err = (input.lastError ?? "").trim();
  const reasons: string[] = [];

  if (input.hasActiveDuplicate) {
    return {
      id: input.id,
      jobType: input.jobType,
      lastError: input.lastError,
      resolution: "obsolete",
      reasons: ["active_sibling_exists"],
      action: "annotate_dlq",
    };
  }

  if (/urgencyScore is not defined/i.test(err)) {
    return {
      id: input.id,
      jobType: input.jobType,
      lastError: input.lastError,
      resolution: "fixed_by_new_architecture",
      reasons: ["translate_urgency_wired_phase4"],
      action: "annotate_dlq",
    };
  }

  if (
    /^(tenant_required|no_handler:|article_not_found|articleId_required)$/i.test(
      err
    )
  ) {
    return {
      id: input.id,
      jobType: input.jobType,
      lastError: input.lastError,
      resolution: "requires_manual_review",
      reasons: ["permanent_payload_or_tenant_error"],
      action: "annotate_dlq",
    };
  }

  const fixedTypes = input.architectureFixedJobTypes ?? [
    "editorial_generate",
    "intelligence_snapshot",
  ];

  if (/job_timeout/i.test(err) || /timeout/i.test(err)) {
    if (fixedTypes.includes(input.jobType)) {
      reasons.push("timeout_under_shared_orchestrate");
      reasons.push("dedicated_or_bounded_lane_addresses_drain");
      return {
        id: input.id,
        jobType: input.jobType,
        lastError: input.lastError,
        resolution:
          input.jobType === "editorial_generate"
            ? "fixed_by_new_architecture"
            : "retryable",
        reasons,
        action: "annotate_dlq",
      };
    }
    return {
      id: input.id,
      jobType: input.jobType,
      lastError: input.lastError,
      resolution: "retryable",
      reasons: ["timeout_retryable_after_capacity_fix"],
      action: "annotate_dlq",
    };
  }

  if (!err) {
    return {
      id: input.id,
      jobType: input.jobType,
      lastError: input.lastError,
      resolution: "requires_manual_review",
      reasons: ["empty_last_error"],
      action: "annotate_dlq",
    };
  }

  return {
    id: input.id,
    jobType: input.jobType,
    lastError: input.lastError,
    resolution: "requires_manual_review",
    reasons: ["unclassified_dlq"],
    action: "annotate_dlq",
  };
}

export function selectRecoveryBatch(
  classifications: BacklogClassification[],
  options: {
    classes?: BacklogClass[];
    batchSize?: number;
    onlySafeAutoPublish?: boolean;
  } = {}
): BacklogClassification[] {
  const batchSize = Math.min(
    options.batchSize ?? RECOVERY_RATE_LIMITS.maxJobsPerBatch,
    RECOVERY_RATE_LIMITS.maxJobsPerBatch
  );
  const allow = new Set(
    options.classes ?? ["eligible_immediate_retry", "stale_claim"]
  );

  return classifications
    .filter((c) => allow.has(c.class))
    .filter((c) => (options.onlySafeAutoPublish ? c.safeToAutoPublish : true))
    .filter((c) => c.action === "retry" || c.action === "release_stale_claim")
    .slice(0, batchSize);
}

export function shouldStopOnErrors(
  consecutiveErrors: number,
  threshold: number = RECOVERY_RATE_LIMITS.stopOnErrorThreshold
): boolean {
  return consecutiveErrors >= threshold;
}

export function buildDefaultContext(
  overrides: Partial<BacklogClassificationContext> = {}
): BacklogClassificationContext {
  return {
    nowMs: Date.now(),
    staleClaimMs: RECOVERY_RATE_LIMITS.staleClaimMs,
    autoPublishMaxAgeHours: RECOVERY_RATE_LIMITS.autoPublishMaxAgeHours,
    obsoleteJobMaxAgeHours: RECOVERY_RATE_LIMITS.obsoleteJobMaxAgeHours,
    dependencyPendingThreshold: RECOVERY_RATE_LIMITS.dependencyPendingThreshold,
    tenantExists: true,
    hasActiveDuplicate: false,
    uncoveredEventCount: 0,
    freshUncoveredEventCount: 0,
    staleUncoveredEventCount: 0,
    eventClusterPending: 0,
    embedSignalsPending: 0,
    payloadEventExists: null,
    payloadEventAlreadyGenerated: false,
    sourceEventExists: null,
    alreadyQuarantined: false,
    ...overrides,
  };
}

export type { DlqResolution };
