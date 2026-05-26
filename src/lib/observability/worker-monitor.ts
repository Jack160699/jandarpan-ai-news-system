/**
 * Worker monitoring — wraps queue worker results with metrics + alerts
 */

import { recordWorkerMetric } from "@/lib/observability/metrics";
import { trackOpsError } from "@/lib/observability/errors";
import type { WorkerResult } from "@/lib/infrastructure/workers/types";

export async function monitorWorkerResult(
  result: WorkerResult,
  requestId?: string
): Promise<WorkerResult> {
  await recordWorkerMetric({
    worker: result.worker,
    ok: result.ok,
    durationMs: result.durationMs,
    skipped: result.skipped,
    ts: new Date().toISOString(),
  });

  if (!result.ok && !result.skipped && result.error) {
    await trackOpsError({
      source: "worker",
      worker: result.worker,
      message: `Worker ${result.worker} failed: ${result.error}`,
      severity: result.worker === "ingest" ? "high" : "medium",
      requestId,
      metadata: result.metadata,
    });
  }

  return result;
}
