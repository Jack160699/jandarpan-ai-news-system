/**
 * GSC Intelligence — structured logging
 */

type GscLogEvent =
  | "sync_started"
  | "sync_completed"
  | "queries_updated"
  | "pages_updated"
  | "recommendations_generated"
  | "index_health_captured";

export function logGsc(
  event: GscLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.log(
    JSON.stringify({
      tag: "[GSC_INTEL]",
      event,
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}

export function errorGsc(
  event: GscLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.error(
    JSON.stringify({
      tag: "[GSC_INTEL]",
      event,
      level: "error",
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}
