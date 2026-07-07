/**
 * Structured ingestion analytics — [INGESTION_ANALYTICS]
 */

import { pipelineLog } from "@/lib/observability/production-log";

export type IngestionAnalyticsEvent =
  | "orchestrate_start"
  | "orchestrate_complete"
  | "worker_start"
  | "worker_complete"
  | "worker_skipped"
  | "provider_fetch"
  | "provider_retry"
  | "provider_disabled"
  | "ingest_batch"
  | "cache_hit"
  | "cache_miss"
  | "revalidate"
  | "degraded";

export type IngestionAnalyticsPayload = {
  event: IngestionAnalyticsEvent;
  worker?: string;
  provider?: string;
  durationMs?: number;
  inserted?: number;
  fetched?: number;
  pending?: number;
  degraded?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
};

export function logIngestionAnalytics(payload: IngestionAnalyticsPayload): void {
  const entry = {
    type: "INGESTION_ANALYTICS",
    ts: new Date().toISOString(),
    ...payload,
  };
  pipelineLog("[INGESTION_ANALYTICS]", entry as Record<string, unknown>);
}
