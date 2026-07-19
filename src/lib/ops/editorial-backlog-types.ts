/**
 * Phase 3 — editorial backlog recovery types and drain rate limits.
 * Classification is evidence-based (DB state + downstream output), not age-only.
 */

export const BACKLOG_CLASSES = [
  "eligible_immediate_retry",
  "eligible_after_dependency_recovery",
  "already_completed",
  "duplicate",
  "stale_claim",
  "obsolete",
  "malformed",
  "missing_source_record",
  "missing_tenant",
  "manual_review_required",
  "dead_letter_candidate",
] as const;

export type BacklogClass = (typeof BACKLOG_CLASSES)[number];

export type RecoveryAction =
  | "none"
  | "retry"
  | "release_stale_claim"
  | "quarantine"
  | "mark_manual_review"
  | "annotate_dlq";

export type DlqResolution =
  | "retryable"
  | "obsolete"
  | "fixed_by_new_architecture"
  | "requires_code_repair"
  | "requires_manual_review";

/** Bounded production drain — never flood AI / DB / publication. */
export const RECOVERY_RATE_LIMITS = {
  /** Max worker_jobs mutations per execute invocation */
  maxJobsPerBatch: 5,
  /** Max editorial_generate wake-ups reset/enqueued per batch */
  maxGenerateWakeupsPerBatch: 3,
  /** Suggested cooldown between execute batches (ops runbook) */
  cooldownMs: 60_000,
  /** Payload `limit` when enqueueing a controlled wake-up */
  maxArticlesPerWakeup: 3,
  /** Abort execute loop after this many consecutive action failures */
  stopOnErrorThreshold: 2,
  /** Events older than this must not auto-publish as breaking */
  autoPublishMaxAgeHours: 36,
  /** Job age beyond which a useless wake-up is obsolete */
  obsoleteJobMaxAgeHours: 72,
  /** Stale claim lease (aligns with worker reclaim default) */
  staleClaimMs: 120_000,
  /** Dependency backlog that blocks immediate retry */
  dependencyPendingThreshold: 20,
} as const;

export type BacklogJobSnapshot = {
  id: string;
  jobType: string;
  status: "pending" | "claimed" | "completed" | "failed" | "dead";
  tenantId: string | null;
  dedupeKey: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  claimedAt: string | null;
  scheduledAt: string;
  createdAt: string;
  result: Record<string, unknown> | null;
};

export type BacklogClassificationContext = {
  nowMs: number;
  staleClaimMs: number;
  autoPublishMaxAgeHours: number;
  obsoleteJobMaxAgeHours: number;
  dependencyPendingThreshold: number;
  /** false when tenant_id is set but newsroom_tenants row missing */
  tenantExists: boolean | null;
  /** Another pending/claimed row shares (job_type, dedupe_key) */
  hasActiveDuplicate: boolean;
  /** news_events without a generated_articles.event_id (tenant-scoped when possible) */
  uncoveredEventCount: number;
  freshUncoveredEventCount: number;
  staleUncoveredEventCount: number;
  eventClusterPending: number;
  embedSignalsPending: number;
  /** When payload carries eventId / event_id */
  payloadEventExists: boolean | null;
  payloadEventAlreadyGenerated: boolean;
  /** When payload carries sourceEventId (event_bus_messages.id) */
  sourceEventExists: boolean | null;
  alreadyQuarantined: boolean;
};

export type BacklogClassification = {
  jobId: string;
  jobType: string;
  status: BacklogJobSnapshot["status"];
  class: BacklogClass;
  action: RecoveryAction;
  reasons: string[];
  safeToAutoPublish: boolean;
  evidence: {
    uncoveredEventCount: number;
    freshUncoveredEventCount: number;
    staleUncoveredEventCount: number;
    hasActiveDuplicate: boolean;
    lastError: string | null;
  };
};

export type DlqClassification = {
  id: string;
  jobType: string;
  lastError: string | null;
  resolution: DlqResolution;
  reasons: string[];
  action: RecoveryAction;
};

export type RecoveryAuditEntry = {
  at: string;
  dryRun: boolean;
  command: string;
  jobId: string;
  jobType: string;
  class: BacklogClass | DlqResolution;
  action: RecoveryAction;
  ok: boolean;
  detail: string;
};

export type BatchVerification = {
  jobsClaimed: number;
  jobsCompleted: number;
  generatedArticlesCreated: number;
  duplicatesAvoided: number;
  queueDepthBefore: number;
  queueDepthAfter: number;
  oldestPendingAgeMsBefore: number | null;
  oldestPendingAgeMsAfter: number | null;
  recentFailureSpike: boolean;
  publicationFlood: boolean;
  ok: boolean;
  notes: string[];
};
