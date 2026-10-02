/**
 * Production wiring shared by the small Edge workers: fail-CLOSED lease, scheduler kill-switch read, run recording.
 */

import { drainBackground } from "@/lib/runtime/background";
import { acquireWorkerRunLease } from "@/lib/infrastructure/workers/run-guard";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { createAdminServerClient } from "@/lib/supabase";
import { evaluateEgressGovernor, recordRunEgress } from "@/lib/observability/egress-governor";
import type { KitDeps } from "@/lib/edge/worker-kit/kit";

async function readSchedulerEnabled(): Promise<boolean | null> {
  try {
    const { data, error } = await createAdminServerClient()
      .from("scheduler_control" as never)
      .select("enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error) return null;
    return (data as { enabled?: boolean } | null)?.enabled === true;
  } catch {
    return null;
  }
}

export function createKitDeps(env: Record<string, string | undefined> = process.env): KitDeps {
  return {
    // Fail CLOSED: if the lease cannot be verified the worker must not run.
    acquireLease: (key, ttlSec) => acquireWorkerRunLease(key, ttlSec, { failOpen: false }),
    isSchedulerEnabled: readSchedulerEnabled,
    recordRun: (run) =>
      recordCronRun({
        job: run.job,
        ok: run.ok,
        degraded: run.degraded,
        startedAt: run.startedAt,
        durationMs: run.durationMs,
        requestId: run.runId,
        error: run.error,
        trigger: "supabase-edge",
        processed: run.processed,
        skipped: run.skipped,
        failed: run.failed,
        metadata: run.metadata,
      }),
    // Inert unless JD_EGRESS_GOVERNOR is set (off by default: no Redis traffic, no effect).
    evaluateEgress: () => evaluateEgressGovernor({ env }),
    recordEgress: () => recordRunEgress({ env }),
    drainBackground: (ms) => drainBackground(ms),
    env,
    newId: () => crypto.randomUUID(),
  };
}
