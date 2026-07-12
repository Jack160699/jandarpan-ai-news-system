/**
 * Standardized production ops event schema — cron, workers, startup, health.
 */

import { JAN_DARPAN_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/jan-darpan-chhattisgarh";
import { opsLogger } from "@/lib/observability/logger";

export type OpsEventStatus = "ok" | "degraded" | "failed" | "skipped";

export type OpsEventInput = {
  subsystem: string;
  operation: string;
  status: OpsEventStatus;
  durationMs?: number;
  entityCount?: number;
  tenant?: string;
  requestId?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
  err?: unknown;
};

const DEFAULT_TENANT = JAN_DARPAN_CHHATTISGARH_TENANT.slug;

/** Emit a structured ops event (always on in production). */
export function logOpsEvent(input: OpsEventInput): void {
  const level =
    input.status === "failed"
      ? "error"
      : input.status === "degraded"
        ? "warn"
        : "info";

  const payload = {
    timestamp: new Date().toISOString(),
    subsystem: input.subsystem,
    operation: input.operation,
    status: input.status,
    duration_ms: input.durationMs,
    entity_count: input.entityCount,
    tenant: input.tenant ?? DEFAULT_TENANT,
    request_id: input.requestId,
    error_code: input.errorCode,
    ...input.metadata,
  };

  if (level === "error") {
    opsLogger.error("ops_event", { ...payload, err: input.err });
  } else if (level === "warn") {
    opsLogger.warn("ops_event", payload);
  } else {
    opsLogger.info("ops_event", payload);
  }
}

/** Cron trigger — always logged (replaces ad-hoc console.log JSON). */
export function logCronTriggered(
  job: string,
  request: Request,
  requestId?: string
): void {
  logOpsEvent({
    subsystem: "cron",
    operation: "triggered",
    status: "ok",
    requestId,
    metadata: {
      job,
      path: new URL(request.url).pathname,
      method: request.method,
    },
  });
}
