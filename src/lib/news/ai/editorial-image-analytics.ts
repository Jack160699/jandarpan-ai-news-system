/**
 * Structured analytics logs for editorial image pipeline
 */

export type EditorialImageAnalyticsEvent =
  | "resolve_start"
  | "resolve_complete"
  | "ai_generate_start"
  | "ai_generate_ok"
  | "ai_generate_fail"
  | "duplicate_prompt_reuse"
  | "duplicate_visual_reuse"
  | "quality_reject"
  | "quality_pass"
  | "repair_attempt"
  | "repair_success"
  | "fallback_applied"
  | "queue_item_complete"
  | "queue_batch_complete"
  | "storage_upload_ok"
  | "storage_upload_fail"
  | "metrics_recorded"
  | "queue_retry_scheduled"
  | "approval_updated";

export type EditorialImageAnalyticsPayload = {
  event: EditorialImageAnalyticsEvent;
  articleId?: string;
  slug?: string;
  category?: string;
  region?: string | null;
  source?: string;
  promptHash?: string | null;
  visualHash?: string | null;
  qualityScore?: number;
  qualityFlags?: string[];
  width?: number;
  height?: number;
  bytes?: number;
  attempts?: number;
  latencyMs?: number;
  error?: string;
  fallbackTier?: number;
  metadata?: Record<string, unknown>;
};

export function logEditorialImageAnalytics(
  payload: EditorialImageAnalyticsPayload
): void {
  const entry = {
    type: "EDITORIAL_IMAGE_ANALYTICS",
    ts: new Date().toISOString(),
    ...payload,
  };
  console.log("[EDITORIAL_IMAGE_ANALYTICS]", JSON.stringify(entry));
}
