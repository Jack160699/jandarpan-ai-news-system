/**
 * SERP Intelligence — structured logging
 */

type SerpLogEvent =
  | "tracking_started"
  | "tracking_completed"
  | "rank_changes"
  | "new_keywords"
  | "lost_keywords"
  | "opportunities_found"
  | "serp_request"
  | "serp_skipped_quota"
  | "gsc_only_mode";

export function logSerp(
  event: SerpLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.log(
    JSON.stringify({
      tag: "[SERP_INTEL]",
      event,
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}

export function errorSerp(
  event: SerpLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.error(
    JSON.stringify({
      tag: "[SERP_INTEL]",
      event,
      level: "error",
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}
