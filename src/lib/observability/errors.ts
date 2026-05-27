/**
 * Admin error tracking — ring buffer + optional Supabase persistence
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { captureOpsException } from "@/lib/observability/sentry";
import { opsLogger } from "@/lib/observability/logger";
import { asJsonObject } from "@/types/json";
import type { OpsErrorEvent, OpsErrorSeverity } from "@/lib/observability/types";

const ERRORS_KEY = "ops:errors:recent:v1";
const MAX_ERRORS = 100;
const ERRORS_TTL_SEC = 86_400;

const memoryErrors: OpsErrorEvent[] = [];

export type TrackErrorInput = {
  source: string;
  message: string;
  severity?: OpsErrorSeverity;
  requestId?: string;
  route?: string;
  worker?: string;
  metadata?: import("@/types/json").JsonObject;
  err?: unknown;
};

export async function trackOpsError(input: TrackErrorInput): Promise<OpsErrorEvent> {
  const event: OpsErrorEvent = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    severity: input.severity ?? "medium",
    source: input.source,
    message: input.message,
    requestId: input.requestId,
    route: input.route,
    worker: input.worker,
    metadata: input.metadata,
    resolved: false,
  };

  memoryErrors.unshift(event);
  if (memoryErrors.length > MAX_ERRORS) memoryErrors.pop();

  const remote = (await cacheGetJson<OpsErrorEvent[]>(ERRORS_KEY)) ?? [];
  remote.unshift(event);
  await cacheSetJson(ERRORS_KEY, remote.slice(0, MAX_ERRORS), ERRORS_TTL_SEC);

  opsLogger.error("ops_error", {
    requestId: input.requestId,
    source: input.source,
    severity: event.severity,
    route: input.route,
    worker: input.worker,
    err: input.err,
  });

  if (input.err && (event.severity === "high" || event.severity === "critical")) {
    await captureOpsException(input.err, {
      source: input.source,
      requestId: input.requestId,
      route: input.route,
    });
  }

  if (isSupabaseConfigured()) {
    persistErrorEvent(event, input.err).catch(() => {
      /* best-effort */
    });
  }

  return event;
}

async function persistErrorEvent(
  event: OpsErrorEvent,
  err?: unknown
): Promise<void> {
  try {
    const supabase = createAdminServerClient();
    await supabase.from("ops_error_events").insert({
      id: event.id,
      severity: event.severity,
      source: event.source,
      message: event.message,
      request_id: event.requestId ?? null,
      route: event.route ?? null,
      worker: event.worker ?? null,
      metadata: asJsonObject({
        ...(event.metadata ?? {}),
        stack:
          err instanceof Error ? err.stack?.split("\n").slice(0, 6) : undefined,
      } as Record<string, unknown>),
      created_at: event.ts,
    });
  } catch {
    /* table may not exist yet */
  }
}

export async function getRecentOpsErrors(limit = 50): Promise<OpsErrorEvent[]> {
  const remote = await cacheGetJson<OpsErrorEvent[]>(ERRORS_KEY);
  const merged = remote ?? memoryErrors;
  return merged.slice(0, limit);
}

export async function getOpsErrorSummary(): Promise<{
  total: number;
  bySeverity: Record<OpsErrorSeverity, number>;
  last24h: number;
}> {
  const errors = await getRecentOpsErrors(100);
  const cutoff = Date.now() - 86_400_000;
  const bySeverity: Record<OpsErrorSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  let last24h = 0;
  for (const e of errors) {
    bySeverity[e.severity]++;
    if (new Date(e.ts).getTime() >= cutoff) last24h++;
  }

  return { total: errors.length, bySeverity, last24h };
}
