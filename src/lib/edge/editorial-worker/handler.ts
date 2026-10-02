/**
 * Editorial worker request handler - runtime-agnostic (Web `Request` in, `Response` out).
 *
 * One invocation processes AT MOST ONE editorial candidate:
 *   auth -> (kill switch) -> feature/provider checks -> `editorial-generate` DB lease -> generateEditorialsFromEvents
 *   ({ limit: 1, skipUpdates, stopAfterLlmCall }) inside a run-scoped LLM call budget -> classify -> log -> respond.
 * Everything that decides whether an article is good enough to publish (geo taxonomy, freshness, headline quality,
 * dedupe, human-quality thresholds), the candidate-attempt backoff / dead-letter, the provider circuit breaker and the
 * quota governor is the EXISTING code path - this file only orchestrates a single item around it.
 *
 * Modes
 *  - "run"  (default): scheduler/manual production run. Never accepts an event id.
 *  - "test": requires EDGE_WORKER_TEST_MODE=true on the function AND an explicit event_id; never scans the backlog.
 *            dry_run defaults to true (full pipeline + gates, nothing persisted).
 *
 * Dependencies are injected so every branch is unit-testable without a database or network.
 */

import { authorizeWorkerRequest } from "@/lib/edge/editorial-worker/auth";
import {
  classifyCandidateOutcome,
  classifyRunFailure,
  type ErrorClass,
} from "@/lib/edge/editorial-worker/classify";
import { createWorkerLogger } from "@/lib/edge/editorial-worker/logging";
import { captureConsole } from "@/lib/edge/worker-kit/console-capture";
import {
  probeRuntime,
  startResourceTracker,
  type ResourceReport,
} from "@/lib/edge/editorial-worker/resources";
import { withLlmCallBudget } from "@/lib/ai/providers/call-budget";
import {
  summarizeProviderCalls,
  withRunTelemetry,
  type ProviderCallSummary,
  type RunTelemetryTotals,
} from "@/lib/ai/providers/run-telemetry";
import type { BatchEditorialResult } from "@/lib/news/ai/editorial-types";
import type { GenerateEditorialsOptions } from "@/lib/news/ai/generate-article";

import { PROBE_MODEL_RE } from "@/lib/edge/editorial-worker/governor-probe";
import { egressMeterEnabled, resetEgress, snapshotEgress } from "@/lib/observability/egress-meter";

export const WORKER_LEASE_KEY = "editorial-generate";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WorkerStatus =
  | "published"
  | "generated_unpublished"
  | "dry_run_ok"
  | "dry_run_gated"
  | "no_eligible_item"
  | "rejected_stale"
  | "rejected_freshness"
  | "rejected_quality"
  | "rejected_duplicate"
  | "quarantined"
  | "failed"
  | "overlap_lock"
  | "kill_switch_off"
  | "egress_budget_stop"
  | "not_enabled"
  | "no_ai_provider"
  | "durable_quota_unavailable"
  | "quota_probe_ok"
  | "quota_probe_failed"
  | "deadline_exceeded"
  | "bad_request"
  | "unauthorized"
  | "test_mode_disabled"
  | "method_not_allowed"
  | "worker_secret_not_configured"
  | "internal_error";

export type WorkerDeps = {
  generate(options: GenerateEditorialsOptions): Promise<BatchEditorialResult>;
  acquireLease(key: string, ttlSec: number): Promise<{ acquired: boolean; release: () => Promise<void> }>;
  /** true/false = scheduler_control.enabled; null = unknown (table absent) */
  isSchedulerEnabled(): Promise<boolean | null>;
  isAnyProviderConfigured(): boolean;
  /**
   * true when provider quota counters live in shared storage (Redis). On Edge every invocation is a fresh isolate, so
   * in-memory counters reset each call and RPM/TPM/RPD/TPD limits would NOT be enforced.
   */
  isDurableQuotaConfigured(): boolean;
  /**
   * A real round-trip through the shared counters' own code path (an EVAL). Credentials being present is not enough:
   * if the atomic call fails the quota governor silently degrades to per-isolate memory, so run mode must refuse.
   * Optional so a deployment without a probe keeps the configured-only check.
   */
  verifyDurableQuota?(): Promise<boolean>;
  /** quota_probe mode: N concurrent atomic check-and-increments against a throwaway key; exactly `limit` may win. */
  probeQuotaAtomicity?(): Promise<{ winners: number; limit: number; parallel: number } | null>;
  /** quota_probe `governor`: reserve/observe phases on a throwaway codecraft model (see governor-probe.ts). */
  probeGovernor?(input: { phase: "reserve" | "observe"; model: string }): Promise<unknown>;
  /** quota_probe `ai`: exactly one tiny real CodeCraft request through the app path. */
  probeAi?(): Promise<unknown>;
  /** Optional egress governor (scheduler-triggered runs only, after the kill switch). */
  evaluateEgress?(): Promise<{ allow: boolean; state: string; reason: string | null; usedBytes: number | null }>;
  recordEgress?(): Promise<{ recorded: boolean; bytes: number; total: number | null; reason?: string }>;
  /** Optional: purge the website's caches after a story is published. */
  revalidatePublished?: () => Promise<void>;
  recordRun(run: {
    ok: boolean;
    degraded: boolean;
    startedAt: string;
    durationMs: number;
    runId: string;
    error?: string;
    processed: number;
    skipped: number;
    failed: number;
    metadata: Record<string, unknown>;
  }): Promise<void>;
  drainBackground(timeoutMs: number): Promise<void>;
  env: Record<string, string | undefined>;
  newId(): string;
  logSink?: (line: string) => void;
};

export type WorkerResponseBody = {
  ok: boolean;
  status: WorkerStatus;
  run_id: string;
  correlation_id: string;
  mode: "run" | "test";
  trigger: string;
  dry_run: boolean;
  event_id: string | null;
  article_id: string | null;
  published: boolean;
  headline_preview?: string | null;
  provider: string | null;
  model: string | null;
  error_class: ErrorClass | null;
  error_reason: string | null;
  provider_retryable: boolean | null;
  duration_ms: number;
  llm: { used: number; max: number; calls: ProviderCallSummary[]; totals: RunTelemetryTotals };
  resources: ResourceReport | null;
  lease: { key: string; acquired: boolean } | null;
  candidate_pool?: BatchEditorialResult["candidatePool"] | null;
  /** quota_probe mode only: result of the Redis round-trip + atomicity check run from inside the Edge runtime. */
  quota_probe?: {
    configured: boolean;
    verified: boolean;
    atomic: boolean | null;
    winners: number | null;
    limit: number | null;
    parallel: number | null;
    latency_ms: number | null;
    governor?: unknown;
    ai?: unknown;
  };
  /** Test mode + include_logs only: everything the run wrote to console (raw, for secret scanning). */
  debug_logs?: string[];
  runtime_probe?: Record<string, unknown>;
};

function intEnv(env: Record<string, string | undefined>, name: string, fallback: number, min: number, max: number): number {
  const n = Number(env[name]);
  return Number.isFinite(n) && n >= min ? Math.min(Math.floor(n), max) : fallback;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

type RequestBody = {
  mode?: unknown;
  event_id?: unknown;
  dry_run?: unknown;
  ignore_backoff?: unknown;
  lease_key?: unknown;
  include_logs?: unknown;
  governor?: unknown;
  model?: unknown;
  ai?: unknown;
};

async function readBody(request: Request): Promise<RequestBody | "too_large" | "invalid"> {
  const len = Number(request.headers.get("content-length") ?? "0");
  if (len > 4096) return "too_large";
  const text = await request.text();
  if (text.length > 4096) return "too_large";
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as RequestBody) : "invalid";
  } catch {
    return "invalid";
  }
}

/** Pick the single result this invocation is about. */
function pickResult(batch: BatchEditorialResult) {
  return batch.results.find((r) => !r.updated) ?? null;
}

const NO_CALLS: RunTelemetryTotals = {
  calls: 0,
  succeeded: 0,
  failed: 0,
  inputTokens: 0,
  outputTokens: 0,
  latencyMsTotal: 0,
  providers: [],
  models: [],
};

export async function handleEditorialWorkerRequest(request: Request, deps: WorkerDeps): Promise<Response> {
  const startedAtMs = Date.now();
  resetEgress();
  const startedAt = new Date(startedAtMs).toISOString();
  const runId = deps.newId();
  const correlationId = request.headers.get("x-correlation-id")?.trim().slice(0, 100) || runId;
  const trigger = (request.headers.get("x-jd-trigger") ?? "manual").trim().toLowerCase().slice(0, 20);
  const log = createWorkerLogger({ run_id: runId, correlation_id: correlationId, trigger }, deps.logSink);

  let capture: ReturnType<typeof captureConsole> | null = null;
  const respond = (
    status: WorkerStatus,
    httpStatus: number,
    fields: Partial<WorkerResponseBody> & { ok: boolean }
  ): Response => {
    const body: WorkerResponseBody = {
      ok: fields.ok,
      status,
      run_id: runId,
      correlation_id: correlationId,
      mode: fields.mode ?? "run",
      trigger,
      dry_run: fields.dry_run ?? false,
      event_id: fields.event_id ?? null,
      article_id: fields.article_id ?? null,
      published: fields.published ?? false,
      headline_preview: fields.headline_preview,
      provider: fields.provider ?? null,
      model: fields.model ?? null,
      error_class: fields.error_class ?? null,
      error_reason: fields.error_reason ?? null,
      provider_retryable: fields.provider_retryable ?? null,
      duration_ms: Date.now() - startedAtMs,
      llm: fields.llm ?? { used: 0, max: 0, calls: [], totals: NO_CALLS },
      resources: fields.resources ?? null,
      lease: fields.lease ?? null,
      candidate_pool: fields.candidate_pool,
      ...(fields.quota_probe ? { quota_probe: fields.quota_probe } : {}),
      ...(capture ? { debug_logs: capture.lines.slice(), runtime_probe: probeRuntime() } : {}),
    };
    return json(body, httpStatus);
  };

  if (request.method !== "POST") {
    return respond("method_not_allowed", 405, { ok: false, error_reason: "POST only" });
  }

  const auth = authorizeWorkerRequest(request, deps.env);
  if (!auth.ok) {
    log.warn("auth_rejected", { reason: auth.reason });
    return respond(auth.status === 503 ? "worker_secret_not_configured" : "unauthorized", auth.status, {
      ok: false,
      error_reason: auth.reason,
    });
  }

  const body = await readBody(request);
  if (body === "too_large" || body === "invalid") {
    return respond("bad_request", 400, { ok: false, error_reason: `body_${body}` });
  }

  // Read-only Redis diagnostic: authenticated, no AI, no database, no lease. Proves the shared quota store is reachable and
  // atomic from inside the Edge runtime without enabling generation.
  if (body.mode === "quota_probe") {
    const configured = deps.isDurableQuotaConfigured();
    const t0 = Date.now();
    const verified = configured && deps.verifyDurableQuota ? await deps.verifyDurableQuota() : false;
    const atom = configured && verified && deps.probeQuotaAtomicity ? await deps.probeQuotaAtomicity() : null;
    const atomic = atom ? atom.winners === atom.limit : null;
    let governor: unknown;
    if (body.governor === "reserve" || body.governor === "observe") {
      const model = typeof body.model === "string" && PROBE_MODEL_RE.test(body.model) ? body.model : null;
      if (!model) return respond("bad_request", 400, { ok: false, error_reason: "governor probe needs model matching edge-probe-[a-z0-9]{4,16}" });
      governor = configured && verified && deps.probeGovernor ? await deps.probeGovernor({ phase: body.governor, model }) : null;
    }
    const ai = body.ai === true && configured && verified && deps.probeAi ? await deps.probeAi() : undefined;
    const pass = configured && verified && atomic === true;
    log.info("quota_probe", { configured, verified, atomic });
    return respond(pass ? "quota_probe_ok" : "quota_probe_failed", 200, {
      ok: pass,
      quota_probe: { configured, verified, atomic, winners: atom?.winners ?? null, limit: atom?.limit ?? null, parallel: atom?.parallel ?? null, latency_ms: configured ? Date.now() - t0 : null, ...(governor !== undefined ? { governor } : {}), ...(ai !== undefined ? { ai } : {}) },
    });
  }

  const mode: "run" | "test" = body.mode === "test" ? "test" : "run";
  if (body.mode !== undefined && body.mode !== "run" && body.mode !== "test") {
    return respond("bad_request", 400, { ok: false, error_reason: "unknown_mode" });
  }

  let eventId: string | undefined;
  let dryRun = false;
  let ignoreBackoff = false;
  let leaseKey = WORKER_LEASE_KEY;
  let includeLogs = false;

  if (mode === "test") {
    if (deps.env.EDGE_WORKER_TEST_MODE !== "true") {
      return respond("test_mode_disabled", 403, { ok: false, mode, error_reason: "EDGE_WORKER_TEST_MODE is not enabled" });
    }
    if (typeof body.event_id !== "string" || !UUID_RE.test(body.event_id)) {
      return respond("bad_request", 400, { ok: false, mode, error_reason: "test mode requires a specific event_id (uuid)" });
    }
    eventId = body.event_id;
    dryRun = body.dry_run !== false; // test mode is dry by default; persisting must be explicit
    ignoreBackoff = body.ignore_backoff === true;
    includeLogs = body.include_logs === true;
    if (typeof body.lease_key === "string" && /^[a-z0-9:_-]{3,60}$/i.test(body.lease_key)) leaseKey = body.lease_key;
  } else if (body.event_id !== undefined) {
    return respond("bad_request", 400, { ok: false, error_reason: "event_id is only accepted in test mode" });
  }

  if (includeLogs) capture = captureConsole();
  log.info("run_start", { mode, dry_run: dryRun, event_id: eventId ?? null, lease_key: leaseKey });

  let heldLease: { release: () => Promise<void> } | null = null;
  let keepLease = false;
  try {
    // Kill switch: a scheduler-triggered run only proceeds while scheduler_control.enabled = true.
    if (mode === "run" && trigger === "scheduler") {
      const enabled = await deps.isSchedulerEnabled();
      if (enabled !== true) {
        log.info("skipped", { reason: "kill_switch_off", scheduler_enabled: enabled });
        return respond("kill_switch_off", 200, { ok: true, mode });
      }
      if (deps.evaluateEgress) {
        const gov = await deps.evaluateEgress();
        if (!gov.allow) {
          log.warn("egress_governor_stop", { state: gov.state, reason: gov.reason, used_bytes: gov.usedBytes });
          return respond("egress_budget_stop", 200, { ok: true, mode, error_reason: gov.reason ?? "egress_budget_stop" });
        }
        if (gov.state === "warn") log.warn("egress_governor_warn", { used_bytes: gov.usedBytes });
      }
    }

    if (deps.env.NEWSROOM_GENERATE_ARTICLES !== "true") {
      log.info("skipped", { reason: "not_enabled" });
      return respond("not_enabled", 200, { ok: true, mode, dry_run: dryRun });
    }
    if (!deps.isAnyProviderConfigured()) {
      log.warn("skipped", { reason: "no_ai_provider_configured" });
      return respond("no_ai_provider", 200, { ok: false, mode, dry_run: dryRun, error_reason: "no_ai_provider_configured" });
    }

    // Provider limits (CodeCraft RPM/TPM/RPD/TPD, Gemini/Groq daily caps) are only enforceable with shared counters.
    // Run mode refuses to spend AI budget without them; test mode may proceed (bounded to one dry-run story).
    if (mode === "run" && !deps.isDurableQuotaConfigured()) {
      log.error("skipped", { reason: "durable_quota_unavailable", hint: "set UPSTASH_REDIS_REST_URL/TOKEN as Edge secrets" });
      return respond("durable_quota_unavailable", 200, { ok: false, mode, error_reason: "durable_quota_unavailable" });
    }
    if (mode === "run" && deps.verifyDurableQuota && !(await deps.verifyDurableQuota())) {
      log.error("skipped", { reason: "durable_quota_unavailable", hint: "Redis is configured but an atomic EVAL round-trip failed" });
      return respond("durable_quota_unavailable", 200, { ok: false, mode, error_reason: "durable_quota_unverified" });
    }
    if (mode === "test" && !deps.isDurableQuotaConfigured()) {
      log.warn("ephemeral_quota", { note: "provider limits are per-isolate in this test run" });
    }

    // The SAME lease key the Vercel route uses, so Vercel and Edge can never generate concurrently.
    const leaseTtlSec = intEnv(deps.env, "EDGE_WORKER_LEASE_TTL_SEC", 240, 30, 900);
    const lease = await deps.acquireLease(leaseKey, leaseTtlSec);
    if (lease.acquired) heldLease = lease;
    if (!lease.acquired) {
      log.info("skipped", { reason: "overlap_lock", lease_key: leaseKey });
      return respond("overlap_lock", 200, { ok: true, mode, dry_run: dryRun, lease: { key: leaseKey, acquired: false } });
    }
    log.info("lease_acquired", { lease_key: leaseKey, ttl_sec: leaseTtlSec });

    const maxCalls = intEnv(deps.env, "EDGE_WORKER_MAX_LLM_CALLS", 2, 1, 6);
    const deadlineMs = intEnv(deps.env, "EDGE_WORKER_DEADLINE_MS", 135_000, 10_000, 600_000);
    const tracker = startResourceTracker();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const work = withRunTelemetry(() =>
      withLlmCallBudget(maxCalls, () =>
        deps.generate({
          limit: 1,
          eventId,
          dryRun,
          skipUpdates: true,
          stopAfterLlmCall: true,
          ignoreBackoff,
          maxAttempts: intEnv(deps.env, "EDITORIAL_MAX_CANDIDATE_ATTEMPTS", 3, 1, 10),
        })
      )
    );
    const deadline = new Promise<"deadline">((resolve) => {
      timer = setTimeout(() => resolve("deadline"), deadlineMs);
    });

    let raced: Awaited<typeof work> | "deadline";
    try {
      raced = await Promise.race([work, deadline]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (raced === "deadline") {
      // Do NOT release the lease: generation may still be running; the TTL expires it. Never risk an overlap.
      keepLease = true;
      const resources = tracker.stop();
      log.error("deadline_exceeded", { deadline_ms: deadlineMs, lease_kept_until_ttl: true });
      return respond("deadline_exceeded", 200, {
        ok: false,
        mode,
        dry_run: dryRun,
        event_id: eventId ?? null,
        error_reason: `deadline_${deadlineMs}ms`,
        resources,
        lease: { key: leaseKey, acquired: true },
      });
    }

    await deps.drainBackground(3_000);
    const resources = tracker.stop();
    const calls = raced.calls;
    const totals = summarizeProviderCalls(calls);
    const budgetRun = raced.value;
    const batch = budgetRun.value;
    const llm = { used: budgetRun.used, max: budgetRun.max, calls, totals };

    const item = pickResult(batch);
    const lastOk = [...calls].reverse().find((c) => c.success && c.endpoint === "chat.completions");
    const provider = lastOk?.provider ?? calls[calls.length - 1]?.provider ?? null;
    const model = lastOk?.model ?? calls[calls.length - 1]?.model ?? null;

    let status: WorkerStatus;
    let errorClass: ErrorClass | null = null;
    let errorReason: string | null = null;
    let providerRetryable: boolean | null = null;

    if (!item) {
      status = "no_eligible_item";
    } else if (item.dryRun) {
      status = item.ok ? "dry_run_ok" : "dry_run_gated";
      if (!item.ok) {
        errorReason = item.reason ?? null;
        errorClass = classifyRunFailure({ reason: item.reason, calls }).errorClass;
      }
    } else if (item.published) {
      status = "published";
    } else if (item.ok && item.articleId) {
      status = "generated_unpublished";
    } else {
      errorReason = item.reason ?? batch.errors[0] ?? null;
      const cls = classifyRunFailure({ reason: errorReason, calls });
      // A gate saying "no" (stale / freshness / quality / duplicate / quarantine) is an explicit OUTCOME, not a failure.
      // Only a provider/runtime problem (no draft produced, invalid model output, unclassified) stays "failed".
      const businessOutcome = cls.providerRetryable === null && cls.errorClass !== "invalid_output" ? classifyCandidateOutcome(errorReason) : null;
      if (businessOutcome) {
        status = businessOutcome;
        errorClass = cls.errorClass;
      } else {
        status = "failed";
        errorClass = cls.errorClass;
        providerRetryable = cls.providerRetryable;
      }
    }

    const isRejection = status.startsWith("rejected_") || status === "quarantined";
    const ok = status !== "failed";
    const resultFields = {
      ok,
      mode,
      dry_run: dryRun,
      event_id: item?.eventId ?? eventId ?? null,
      article_id: item?.articleId ?? null,
      published: status === "published",
      headline_preview: item?.draftPreview?.headline ?? null,
      provider,
      model,
      error_class: errorClass,
      error_reason: errorReason,
      provider_retryable: providerRetryable,
      llm,
      resources,
      lease: { key: leaseKey, acquired: true },
      candidate_pool: batch.candidatePool ?? null,
    };

    log.info("run_complete", {
      status,
      ok,
      event_id: resultFields.event_id,
      article_id: resultFields.article_id,
      provider,
      model,
      error_class: errorClass,
      error_reason: errorReason,
      provider_retryable: providerRetryable,
      duration_ms: Date.now() - startedAtMs,
      llm_calls: totals.calls,
      llm_failed_calls: totals.failed,
      input_tokens: totals.inputTokens,
      output_tokens: totals.outputTokens,
      cpu_ms: resources.cpu_ms,
      cpu_verified: resources.cpu_verified,
      rss_peak_mb: resources.rss_peak_mb,
      wall_ms: resources.wall_ms,
    });

    if (!dryRun && status === "published" && deps.revalidatePublished) {
      await deps.revalidatePublished().catch(() => undefined);
    }

    const egressRecord = !dryRun && deps.recordEgress ? await deps.recordEgress().catch(() => null) : null;

    if (!dryRun) {
      await deps
        .recordRun({
          ok,
          degraded: status === "no_eligible_item" || status === "generated_unpublished",
          startedAt,
          durationMs: Date.now() - startedAtMs,
          runId,
          // Only genuine failures carry an error: a business rejection is an outcome, kept in metadata.outcome_reason.
          error: status === "failed" ? (errorReason ?? undefined) : undefined,
          processed: status === "published" ? 1 : 0,
          skipped: status === "no_eligible_item" || isRejection ? 1 : 0,
          failed: status === "failed" ? 1 : 0,
          metadata: {
            runtime: "supabase-edge",
            correlation_id: correlationId,
            status,
            // Explicit outcome vocabulary shared with the fetch worker and the admin failure center.
            outcome: status === "failed" ? "failure" : status === "no_eligible_item" ? "no_work" : status,
            outcome_reason: errorReason,
            event_id: resultFields.event_id,
            article_id: resultFields.article_id,
            ...(egressMeterEnabled() ? { egress: snapshotEgress() } : {}),
            ...(egressRecord ? { egress_governor: egressRecord } : {}),
            provider,
            model,
            error_class: errorClass,
            llm_calls: totals.calls,
            input_tokens: totals.inputTokens,
            output_tokens: totals.outputTokens,
            cpu_ms: resources.cpu_ms,
            cpu_verified: resources.cpu_verified,
            rss_peak_mb: resources.rss_peak_mb,
          },
        })
        .catch(() => undefined);
    }

    return respond(status, 200, resultFields);
  } catch (err) {
    log.error("run_error", { error: err instanceof Error ? err : String(err) });
    return respond("internal_error", 500, {
      ok: false,
      mode,
      dry_run: dryRun,
      event_id: eventId ?? null,
      error_class: "unclassified",
      error_reason: err instanceof Error ? err.message.slice(0, 200) : "internal_error",
    });
  } finally {
    // Always release, except after a deadline: generation may still be running, so the TTL must expire the lease.
    if (heldLease && !keepLease) await heldLease.release().catch(() => undefined);
    capture?.restore();
  }
}
