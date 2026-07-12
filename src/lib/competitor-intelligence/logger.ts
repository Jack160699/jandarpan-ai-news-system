/**
 * Competitor Intelligence — structured logging
 */

type CompetitorLogEvent =
  | "crawl_start"
  | "crawl_finish"
  | "articles_saved"
  | "duplicates"
  | "errors"
  | "source_skip"
  | "source_fetch";

export function logCompetitorIntel(
  event: CompetitorLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.log(
    JSON.stringify({
      tag: "[COMPETITOR_INTEL]",
      event,
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}

export function warnCompetitorIntel(
  event: CompetitorLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.warn(
    JSON.stringify({
      tag: "[COMPETITOR_INTEL]",
      event,
      level: "warn",
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}

export function errorCompetitorIntel(
  event: CompetitorLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.error(
    JSON.stringify({
      tag: "[COMPETITOR_INTEL]",
      event,
      level: "error",
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}
