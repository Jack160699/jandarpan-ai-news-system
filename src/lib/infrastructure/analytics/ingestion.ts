/**
 * Structured ingestion analytics — [INGESTION_ANALYTICS]
 */

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
  if (process.env.NODE_ENV === "production") {
    const logLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (logLevel !== "debug" && logLevel !== "info") return;
  }

  const entry = {
    type: "INGESTION_ANALYTICS",
    ts: new Date().toISOString(),
    ...payload,
  };
  console.log("[INGESTION_ANALYTICS]", JSON.stringify(entry));
}
