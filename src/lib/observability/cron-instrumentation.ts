/**
 * Cron route instrumentation — request IDs, heartbeats, structured events.
 */

import {
  recordCronRun,
  type CronRunRecord,
} from "@/lib/observability/cron-monitor";
import {
  generateRequestId,
  getRequestIdFromHeaders,
} from "@/lib/observability/request-id";
import { logCronTriggered, logOpsEvent } from "@/lib/observability/ops-event";
import { trackOpsError } from "@/lib/observability/errors";
import type { JsonObject } from "@/types/json";

export function resolveCronRequestId(request: Request): string {
  return getRequestIdFromHeaders(request.headers) ?? generateRequestId();
}

export function instrumentCronStart(
  job: string,
  request: Request
): { startedAt: number; requestId: string } {
  const requestId = resolveCronRequestId(request);
  logCronTriggered(job, request, requestId);
  return { startedAt: Date.now(), requestId };
}

export type FinalizeCronInput = {
  job: string;
  startedAt: number;
  requestId: string;
  ok: boolean;
  degraded?: boolean;
  entityCount?: number;
  error?: string;
  errorCode?: string;
  workers?: CronRunRecord["workers"];
  metadata?: Record<string, unknown>;
  err?: unknown;
};

/** Record heartbeat + structured completion event. */
export async function finalizeCronRun(input: FinalizeCronInput): Promise<void> {
  const durationMs = Date.now() - input.startedAt;
  const status = !input.ok ? "failed" : input.degraded ? "degraded" : "ok";

  await recordCronRun({
    job: input.job,
    ok: input.ok,
    startedAt: new Date(input.startedAt).toISOString(),
    durationMs,
    degraded: input.degraded,
    entityCount: input.entityCount,
    requestId: input.requestId,
    workers: input.workers,
    error: input.error,
    metadata: input.metadata,
  });

  logOpsEvent({
    subsystem: "cron",
    operation: input.job,
    status,
    durationMs,
    entityCount: input.entityCount,
    requestId: input.requestId,
    errorCode: input.errorCode ?? input.error,
    metadata: input.metadata,
    err: input.err,
  });

  if (!input.ok && input.err) {
    await trackOpsError({
      source: "cron",
      worker: input.job,
      message: input.error ?? `${input.job}_failed`,
      severity: "high",
      requestId: input.requestId,
      metadata: input.metadata as JsonObject | undefined,
      err: input.err,
    });
  }
}
