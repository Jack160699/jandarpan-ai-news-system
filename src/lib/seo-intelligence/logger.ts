/**
 * SEO Intelligence Engine — structured logging
 */

type SeoIntelLogEvent =
  | "analysis_started"
  | "analysis_finished"
  | "recommendations_generated"
  | "gaps_found"
  | "keywords_updated";

export function logSeoIntel(
  event: SeoIntelLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.log(
    JSON.stringify({
      tag: "[SEO_INTEL]",
      event,
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}

export function errorSeoIntel(
  event: SeoIntelLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.error(
    JSON.stringify({
      tag: "[SEO_INTEL]",
      event,
      level: "error",
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}
