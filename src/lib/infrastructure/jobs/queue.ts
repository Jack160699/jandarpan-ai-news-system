/**
 * Postgres-backed job queue with deduplication, retries, and dead-letter routing
 */

import { createAdminClient } from "@/lib/supabase";
import { asJsonObject, type JsonObject } from "@/types/json";
import { nextRetryAt, shouldMoveToDeadLetter } from "@/lib/infrastructure/jobs/retry";
import type {
  EnqueueJobInput,
  JobHandler,
  JobHandlerResult,
  JobType,
  WorkerJobRow,
} from "@/lib/infrastructure/jobs/types";
import type { ExecutionDeadline } from "@/lib/serverless/deadline";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { recordJobRun } from "@/lib/infrastructure/jobs/monitor";

const DEFAULT_BATCH = Number(process.env.WORKER_JOB_BATCH) || 8;
const STALE_CLAIM_MS = Number(process.env.WORKER_STALE_CLAIM_MS) || 120_000;

async function releaseClaimedJob(jobId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("worker_jobs")
    .update({
      status: "pending",
      claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "claimed");
}

/** Reclaim jobs stuck in claimed state (crashed worker recovery). */
export async function reclaimStaleClaimedJobs(
  staleMs = STALE_CLAIM_MS
): Promise<number> {
  const supabase = createAdminClient();
  const threshold = new Date(Date.now() - staleMs).toISOString();

  const { data, error } = await supabase
    .from("worker_jobs")
    .update({
      status: "pending",
      claimed_at: null,
      last_error: "[reclaimed stale claim]",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "claimed")
    .lt("claimed_at", threshold)
    .select("id");

  if (error) {
    console.warn("[worker-jobs] reclaim:", error.message);
    return 0;
  }

  const reclaimed = data?.length ?? 0;
  if (reclaimed > 0) {
    console.log(
      JSON.stringify({
        tag: "[worker-jobs]",
        phase: "reclaim_stale",
        reclaimed,
        staleMs,
        ts: new Date().toISOString(),
      })
    );
  }
  return reclaimed;
}

export async function enqueueJob(input: EnqueueJobInput): Promise<string | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("worker_jobs")
    .select("id")
    .eq("job_type", input.jobType)
    .eq("dedupe_key", input.dedupeKey)
    .in("status", ["pending", "claimed"])
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("worker_jobs")
      .update({
        priority: Math.max(input.priority ?? 0, 0),
        scheduled_at: (input.scheduledAt ?? new Date()).toISOString(),
        payload: asJsonObject(input.payload ?? {}),
        updated_at: now,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("worker_jobs")
    .insert({
      tenant_id: input.tenantId ?? null,
      job_type: input.jobType,
      dedupe_key: input.dedupeKey,
      payload: asJsonObject(input.payload ?? {}),
      status: "pending",
      priority: input.priority ?? 0,
      max_attempts: input.maxAttempts ?? 5,
      scheduled_at: (input.scheduledAt ?? new Date()).toISOString(),
      timeout_ms: input.timeoutMs ?? 120_000,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("[worker-jobs] enqueue:", error.message);
    return null;
  }

  return data?.id ?? null;
}

export async function enqueueJobs(
  jobs: EnqueueJobInput[]
): Promise<number> {
  let count = 0;
  for (const job of jobs) {
    const id = await enqueueJob(job);
    if (id) count += 1;
  }
  return count;
}

export async function claimJobBatch(
  limit = DEFAULT_BATCH,
  jobTypes?: JobType[],
  options?: { oldestFirst?: boolean; excludeJobTypes?: JobType[] }
): Promise<WorkerJobRow[]> {
  await reclaimStaleClaimedJobs();

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("worker_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (!options?.oldestFirst) {
    // Normal mode: honor priority, but keep FIFO inside priority bands.
    query = query.order("priority", { ascending: false });
  }

  query = query
    .limit(limit);

  if (jobTypes?.length) {
    query = query.in("job_type", jobTypes);
  }

  if (options?.excludeJobTypes?.length) {
    query = query.not(
      "job_type",
      "in",
      `(${options.excludeJobTypes.join(",")})`
    );
  }

  const { data: pending, error } = await query;
  if (error || !pending?.length) return [];

  const ids = pending.map((r) => r.id);
  const { data: claimed, error: claimError } = await supabase
    .from("worker_jobs")
    .update({
      status: "claimed",
      claimed_at: now,
      updated_at: now,
    })
    .in("id", ids)
    .eq("status", "pending")
    .select("*");

  if (claimError || !claimed?.length) return [];

  return claimed as WorkerJobRow[];
}

export async function completeJob(
  jobId: string,
  result?: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  await supabase
    .from("worker_jobs")
    .update({
      status: "completed",
      completed_at: now,
      result: asJsonObject(result ?? {}),
      updated_at: now,
    })
    .eq("id", jobId);
}

export async function failJob(
  job: WorkerJobRow,
  errorMessage: string,
  retryable = true
): Promise<void> {
  const supabase = createAdminClient();
  const attempts = job.attempts + 1;
  const now = new Date().toISOString();

  if (
    !retryable ||
    shouldMoveToDeadLetter(attempts, job.max_attempts)
  ) {
    await supabase
      .from("worker_jobs")
      .update({
        status: "dead",
        attempts,
        last_error: errorMessage,
        updated_at: now,
      })
      .eq("id", job.id);

    await supabase.from("worker_dead_letters").insert({
      job_id: job.id,
      tenant_id: job.tenant_id,
      job_type: job.job_type,
      dedupe_key: job.dedupe_key,
      payload: job.payload,
      attempts,
      last_error: errorMessage,
    });
    return;
  }

  const retryAt = nextRetryAt(attempts);
  await supabase
    .from("worker_jobs")
    .update({
      status: "pending",
      attempts,
      last_error: errorMessage,
      scheduled_at: retryAt.toISOString(),
      claimed_at: null,
      updated_at: now,
    })
    .eq("id", job.id);
}

async function isJobTimedOut(job: WorkerJobRow): Promise<boolean> {
  if (!job.claimed_at) return false;
  const elapsed = Date.now() - new Date(job.claimed_at).getTime();
  return elapsed > job.timeout_ms;
}

function resolveJobRaceTimeoutMs(
  job: WorkerJobRow,
  deadline?: ExecutionDeadline
): number {
  const reserveMs = INFRA_CONFIG.workerDeadlineReserveMs;
  if (deadline) {
    const budget = deadline.remainingMs() - reserveMs;
    if (budget <= 0) return 1;
    return Math.min(job.timeout_ms, budget);
  }
  return job.timeout_ms;
}

export async function processJobBatch(
  handlers: Map<JobType, JobHandler>,
  options?: {
    limit?: number;
    jobTypes?: JobType[];
    excludeJobTypes?: JobType[];
    workerId?: string;
    deadline?: ExecutionDeadline;
    oldestFirst?: boolean;
  }
): Promise<{
  processed: number;
  completed: number;
  failed: number;
  dead: number;
  partial?: boolean;
  released?: number;
}> {
  const jobs = await claimJobBatch(options?.limit, options?.jobTypes, {
    oldestFirst: options?.oldestFirst,
    excludeJobTypes: options?.excludeJobTypes,
  });
  const deadline = options?.deadline;
  const reserveMs = INFRA_CONFIG.workerDeadlineReserveMs;
  let completed = 0;
  let failed = 0;
  let dead = 0;
  let partial = false;
  let released = 0;
  let processed = 0;

  for (const job of jobs) {
    if (deadline?.shouldStop() || (deadline && !deadline.hasBudgetFor(reserveMs))) {
      await releaseClaimedJob(job.id);
      released++;
      partial = true;
      continue;
    }

    processed++;
    const started = Date.now();
    const handler = handlers.get(job.job_type as JobType);

    if (!handler) {
      await failJob(job, `no_handler:${job.job_type}`, false);
      dead += 1;
      continue;
    }

    if (await isJobTimedOut(job)) {
      await failJob(job, "timeout_precheck", true);
      failed += 1;
      continue;
    }

    try {
      const raceTimeoutMs = resolveJobRaceTimeoutMs(job, deadline);
      const result: JobHandlerResult = await Promise.race([
        handler(job),
        new Promise<JobHandlerResult>((_, reject) =>
          setTimeout(
            () => reject(new Error("job_timeout")),
            raceTimeoutMs
          )
        ),
      ]);

      const durationMs = Date.now() - started;

      if (result.ok) {
        await completeJob(job.id, result.result);
        completed += 1;
        await recordJobRun({
          workerId: options?.workerId ?? "job_processor",
          jobId: job.id,
          jobType: job.job_type,
          tenantId: job.tenant_id,
          ok: true,
          durationMs,
          metadata: result.result
            ? asJsonObject(result.result)
            : undefined,
        });
      } else {
        await failJob(job, result.error ?? "job_failed", result.retryable !== false);
        if (job.attempts + 1 >= job.max_attempts) dead += 1;
        else failed += 1;
        await recordJobRun({
          workerId: options?.workerId ?? "job_processor",
          jobId: job.id,
          jobType: job.job_type,
          tenantId: job.tenant_id,
          ok: false,
          durationMs,
          error: result.error,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "job_exception";
      await failJob(job, msg, true);
      failed += 1;
      const isDead = job.attempts + 1 >= job.max_attempts;
      if (isDead) {
        dead += 1;
        const { captureOpsException } = await import("@/lib/observability/sentry");
        await captureOpsException(err, {
          worker: options?.workerId ?? "job_processor",
          jobType: job.job_type,
          jobId: job.id,
          error: msg,
        });
      }
      await recordJobRun({
        workerId: options?.workerId ?? "job_processor",
        jobId: job.id,
        jobType: job.job_type,
        tenantId: job.tenant_id,
        ok: false,
        durationMs: Date.now() - started,
        error: msg,
      });
    }
  }

  return {
    processed,
    completed,
    failed,
    dead,
    partial,
    released,
  };
}

export async function countPendingJobs(jobType?: JobType): Promise<number> {
  const supabase = createAdminClient();
  let query = supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (jobType) query = query.eq("job_type", jobType);

  const { count } = await query;
  return count ?? 0;
}

export async function countDeadLetters(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("worker_dead_letters")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

/** Reset a dead job back to pending without creating a duplicate row. */
export async function reviveDeadJob(
  jobType: JobType,
  dedupeKey: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: active } = await supabase
    .from("worker_jobs")
    .select("id")
    .eq("job_type", jobType)
    .eq("dedupe_key", dedupeKey)
    .in("status", ["pending", "claimed"])
    .maybeSingle();

  if (active?.id) return active.id;

  const { data: dead } = await supabase
    .from("worker_jobs")
    .select("id")
    .eq("job_type", jobType)
    .eq("dedupe_key", dedupeKey)
    .eq("status", "dead")
    .maybeSingle();

  if (!dead?.id) return null;

  const { error } = await supabase
    .from("worker_jobs")
    .update({
      status: "pending",
      attempts: 0,
      last_error: null,
      claimed_at: null,
      completed_at: null,
      scheduled_at: now,
      updated_at: now,
    })
    .eq("id", dead.id)
    .eq("status", "dead");

  if (error) {
    console.warn("[worker-jobs] revive:", error.message);
    return null;
  }

  return dead.id;
}

export async function purgeDeadLetterRows(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const supabase = createAdminClient();
  const unique = [...new Set(ids)];
  const { count, error } = await supabase
    .from("worker_dead_letters")
    .delete({ count: "exact" })
    .in("id", unique);

  if (error) {
    console.warn("[worker-jobs] purge dead letters:", error.message);
    return 0;
  }

  return count ?? 0;
}
