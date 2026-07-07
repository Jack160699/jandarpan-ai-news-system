/**
 * Automated production data retention — DB RPC + queue stale-job cleanup.
 */

import { createAdminClient } from "@/lib/supabase";
import { runQueueCleanup } from "@/lib/ops/queue-cleanup";
import { pipelineLog } from "@/lib/observability/production-log";

export type RetentionStats = Record<string, number | string>;

export type RetentionRunResult = {
  ok: boolean;
  db: RetentionStats | null;
  queueCleanup: Awaited<ReturnType<typeof runQueueCleanup>> | null;
  durationMs: number;
  error?: string;
};

const QUEUE_CLEANUP_STALE_THRESHOLD = Number(
  process.env.QUEUE_CLEANUP_AUTO_THRESHOLD ?? 200
);

export async function runDatabaseRetention(): Promise<RetentionStats | null> {
  const supabase = createAdminClient();
  const { data, error } = await (
    supabase as unknown as {
      rpc: (fn: string) => Promise<{
        data: RetentionStats | null;
        error: { message: string } | null;
      }>;
    }
  ).rpc("cleanup_old_data");

  if (error) {
    throw new Error(`cleanup_old_data failed: ${error.message}`);
  }

  return (data as RetentionStats | null) ?? null;
}

export async function runProductionRetention(options?: {
  skipQueueCleanup?: boolean;
  queueStaleThreshold?: number;
}): Promise<RetentionRunResult> {
  const started = Date.now();
  const threshold =
    options?.queueStaleThreshold ?? QUEUE_CLEANUP_STALE_THRESHOLD;

  try {
    const db = await runDatabaseRetention();
    pipelineLog("[retention] database", db ?? undefined);

    let queueCleanup: Awaited<ReturnType<typeof runQueueCleanup>> | null = null;

    if (!options?.skipQueueCleanup) {
      const { auditAllQueues } = await import("@/lib/ops/queue-cleanup");
      const audit = await auditAllQueues();
      const pendingTotal =
        audit.ai.pending +
        audit.image.pending +
        audit.translation.pending +
        audit.worker.pending;

      if (pendingTotal >= threshold) {
        queueCleanup = await runQueueCleanup({ dryRun: false });
        pipelineLog("[retention] queue_cleanup", {
          removed: queueCleanup.removed.total,
          archived: queueCleanup.archived,
        });
      }
    }

    return {
      ok: true,
      db,
      queueCleanup,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      db: null,
      queueCleanup: null,
      durationMs: Date.now() - started,
      error: message,
    };
  }
}
