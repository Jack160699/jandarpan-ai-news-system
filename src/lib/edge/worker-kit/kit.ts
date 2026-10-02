/**
 * Generic hardened request flow for the small Supabase Edge workers (fetch shards, cluster, translation).
 *
 *   method -> auth (fail closed) -> body -> kill switch (scheduler-triggered runs only) -> precheck -> DB lease
 *   (fail closed) -> run within a wall-clock deadline -> record ops_cron_runs -> structured response
 *
 * Same guarantees as the editorial worker: one bounded unit of work per invocation, mutual exclusion through
 * worker_run_leases (a stuck/overlapping run is refused, never doubled), a deadline that keeps the lease when exceeded,
 * secret-redacting JSON logs with run/correlation ids, and no secret ever in a response.
 */

import { authorizeWorkerRequest } from "@/lib/edge/editorial-worker/auth";
import { createWorkerLogger, type WorkerLogger } from "@/lib/edge/editorial-worker/logging";
import { startResourceTracker, type ResourceReport } from "@/lib/edge/editorial-worker/resources";
import { captureConsole } from "@/lib/edge/worker-kit/console-capture";
import { egressMeterEnabled, resetEgress, snapshotEgress } from "@/lib/observability/egress-meter";

export type KitStatus =
  | "completed"
  | "degraded"
  | "failed"
  | "skipped"
  | "kill_switch_off"
  | "overlap_lock"
  | "deadline_exceeded"
  | "bad_request"
  | "unauthorized"
  | "method_not_allowed"
  | "worker_secret_not_configured"
  | "internal_error";

export type KitDeps = {
  acquireLease(key: string, ttlSec: number): Promise<{ acquired: boolean; release: () => Promise<void> }>;
  /** true/false = scheduler_control.enabled; null = unknown (treated as "not enabled") */
  isSchedulerEnabled(): Promise<boolean | null>;
  recordRun(run: {
    job: string;
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
  /**
   * Optional egress governor (see observability/egress-governor.ts). Evaluated for scheduler-triggered runs only, AFTER the kill
   * switch; a decision with allow=false skips the run. Absent = no governor.
   */
  evaluateEgress?(): Promise<{ allow: boolean; state: string; reason: string | null; usedBytes: number | null }>;
  /** Optional: add this run's metered bytes to the durable monthly counter; the result is stored in the run metadata. */
  recordEgress?(): Promise<{ recorded: boolean; bytes: number; total: number | null; reason?: string }>;
  drainBackground(timeoutMs: number): Promise<void>;
  env: Record<string, string | undefined>;
  newId(): string;
  logSink?: (line: string) => void;
};

export type WorkerRunOutcome = {
  ok: boolean;
  degraded?: boolean;
  processed: number;
  skipped?: number;
  failed?: number;
  error?: string;
  /** Small, JSON-safe summary returned to the caller and stored as run metadata. */
  details: Record<string, unknown>;
};

export type WorkerSpec<P> = {
  /** ops_cron_runs.job - keep the names the admin dashboard already tracks. */
  job: string;
  parse(body: Record<string, unknown>, env: Record<string, string | undefined>):
    | { ok: true; params: P; leaseKey: string; label: Record<string, unknown> }
    | { ok: false; reason: string };
  /** Cheap pre-flight (no lease needed). Return a reason to skip the run. */
  precheck?(params: P, deps: KitDeps): Promise<{ reason: string; details?: Record<string, unknown> } | null>;
  run(ctx: { params: P; deps: KitDeps; log: WorkerLogger; deadlineMs: number }): Promise<WorkerRunOutcome>;
  /** Wall-clock budget for run(); Edge Free allows 150 s, so the default leaves headroom. */
  deadlineMs?: number;
  leaseTtlSec?: number;
};

export type KitResponseBody = {
  ok: boolean;
  status: KitStatus;
  reason: string | null;
  job: string;
  run_id: string;
  correlation_id: string;
  trigger: string;
  label: Record<string, unknown> | null;
  duration_ms: number;
  result: Record<string, unknown> | null;
  resources: ResourceReport | null;
  lease: { key: string; acquired: boolean } | null;
  /** Only when EDGE_WORKER_TEST_MODE=true AND the request sets include_logs: everything the run wrote to console. */
  debug_logs?: string[];
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function readBody(request: Request): Promise<Record<string, unknown> | "too_large" | "invalid"> {
  const len = Number(request.headers.get("content-length") ?? "0");
  if (len > 4096) return "too_large";
  const text = await request.text();
  if (text.length > 4096) return "too_large";
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : "invalid";
  } catch {
    return "invalid";
  }
}

function intEnv(env: Record<string, string | undefined>, name: string, fallback: number, min: number, max: number): number {
  const n = Number(env[name]);
  return Number.isFinite(n) && n >= min ? Math.min(Math.floor(n), max) : fallback;
}

export async function handleWorkerRequest<P>(request: Request, spec: WorkerSpec<P>, deps: KitDeps): Promise<Response> {
  const startedAtMs = Date.now();
  resetEgress();
  const startedAt = new Date(startedAtMs).toISOString();
  const runId = deps.newId();
  const correlationId = request.headers.get("x-correlation-id")?.trim().slice(0, 100) || runId;
  const trigger = (request.headers.get("x-jd-trigger") ?? "manual").trim().toLowerCase().slice(0, 20);
  const log = createWorkerLogger({ run_id: runId, correlation_id: correlationId, trigger, job: spec.job }, deps.logSink);

  let capture: ReturnType<typeof captureConsole> | null = null;
  const respond = (
    status: KitStatus,
    httpStatus: number,
    f: { ok: boolean; reason?: string; label?: Record<string, unknown>; result?: Record<string, unknown>; resources?: ResourceReport | null; lease?: { key: string; acquired: boolean } | null }
  ): Response =>
    json(
      {
        ok: f.ok,
        status,
        reason: f.reason ?? null,
        job: spec.job,
        run_id: runId,
        correlation_id: correlationId,
        trigger,
        label: f.label ?? null,
        duration_ms: Date.now() - startedAtMs,
        result: f.result ?? null,
        resources: f.resources ?? null,
        lease: f.lease ?? null,
        ...(capture ? { debug_logs: capture.lines.slice() } : {}),
      } satisfies KitResponseBody,
      httpStatus
    );

  if (request.method !== "POST") return respond("method_not_allowed", 405, { ok: false, reason: "POST only" });

  const auth = authorizeWorkerRequest(request, deps.env);
  if (!auth.ok) {
    log.warn("auth_rejected", { reason: auth.reason });
    return respond(auth.status === 503 ? "worker_secret_not_configured" : "unauthorized", auth.status, { ok: false, reason: auth.reason });
  }

  const body = await readBody(request);
  if (body === "too_large" || body === "invalid") return respond("bad_request", 400, { ok: false, reason: `body_${body}` });
  const parsed = spec.parse(body, deps.env);
  if (!parsed.ok) return respond("bad_request", 400, { ok: false, reason: parsed.reason });

  const { params, leaseKey, label } = parsed;
  if (body.include_logs === true && deps.env.EDGE_WORKER_TEST_MODE === "true") capture = captureConsole();
  log.info("run_start", { ...label, lease_key: leaseKey });

  let heldLease: { release: () => Promise<void> } | null = null;
  let keepLease = false;
  try {
    if (trigger === "scheduler") {
      const enabled = await deps.isSchedulerEnabled();
      if (enabled !== true) {
        log.info("skipped", { reason: "kill_switch_off", scheduler_enabled: enabled });
        return respond("kill_switch_off", 200, { ok: true, label });
      }
    }

    if (trigger === "scheduler" && deps.evaluateEgress) {
      const gov = await deps.evaluateEgress();
      if (!gov.allow) {
        log.warn("egress_governor_stop", { state: gov.state, reason: gov.reason, used_bytes: gov.usedBytes });
        return respond("skipped", 200, { ok: true, reason: gov.reason ?? "egress_budget_stop", label, result: { egress_governor: gov } });
      }
      if (gov.state === "warn") log.warn("egress_governor_warn", { used_bytes: gov.usedBytes });
    }

    const pre = await spec.precheck?.(params, deps);
    if (pre) {
      log.info("skipped", { reason: pre.reason });
      return respond("skipped", 200, { ok: true, reason: pre.reason, label, result: pre.details });
    }

    const lease = await deps.acquireLease(leaseKey, spec.leaseTtlSec ?? intEnv(deps.env, "EDGE_WORKER_LEASE_TTL_SEC", 240, 30, 900));
    if (lease.acquired) heldLease = lease;
    if (!lease.acquired) {
      log.info("skipped", { reason: "overlap_lock", lease_key: leaseKey });
      return respond("overlap_lock", 200, { ok: true, label, lease: { key: leaseKey, acquired: false } });
    }

    const deadlineMs = spec.deadlineMs ?? intEnv(deps.env, "EDGE_WORKER_DEADLINE_MS", 135_000, 10_000, 600_000);
    const tracker = startResourceTracker();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<"deadline">((resolve) => {
      timer = setTimeout(() => resolve("deadline"), deadlineMs);
    });
    let raced: WorkerRunOutcome | "deadline";
    try {
      raced = await Promise.race([spec.run({ params, deps, log, deadlineMs }), deadline]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (raced === "deadline") {
      keepLease = true; // work may still be running: let the TTL expire the lease, never risk an overlap
      const resources = tracker.stop();
      log.error("deadline_exceeded", { deadline_ms: deadlineMs, lease_kept_until_ttl: true });
      return respond("deadline_exceeded", 200, { ok: false, reason: `deadline_${deadlineMs}ms`, label, resources, lease: { key: leaseKey, acquired: true } });
    }

    await deps.drainBackground(3_000);
    const resources = tracker.stop();
    const egressRecord = deps.recordEgress ? await deps.recordEgress().catch(() => null) : null;
    const status: KitStatus = !raced.ok ? "failed" : raced.degraded ? "degraded" : "completed";
    log.info("run_complete", { status, processed: raced.processed, failed: raced.failed ?? 0, duration_ms: Date.now() - startedAtMs, cpu_verified: resources.cpu_verified, heap_peak_mb: resources.heap_peak_mb, error: raced.error ?? null });

    await deps
      .recordRun({
        job: spec.job,
        ok: raced.ok,
        degraded: Boolean(raced.degraded),
        startedAt,
        durationMs: Date.now() - startedAtMs,
        runId,
        error: raced.error,
        processed: raced.processed,
        skipped: raced.skipped ?? 0,
        failed: raced.failed ?? 0,
        metadata: {
          runtime: "supabase-edge",
          correlation_id: correlationId,
          ...label,
          ...raced.details,
          ...(egressMeterEnabled() ? { egress: snapshotEgress() } : {}),
          ...(egressRecord ? { egress_governor: egressRecord } : {}),
        },
      })
      .catch(() => undefined);

    return respond(status, 200, { ok: raced.ok, reason: raced.error, label, result: raced.details, resources, lease: { key: leaseKey, acquired: true } });
  } catch (err) {
    log.error("run_error", { error: err instanceof Error ? err : String(err) });
    return respond("internal_error", 500, { ok: false, reason: err instanceof Error ? err.message.slice(0, 200) : "internal_error", label });
  } finally {
    if (heldLease && !keepLease) await heldLease.release().catch(() => undefined);
    capture?.restore();
  }
}
