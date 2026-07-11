/**
 * AI Editorial Copilot — structured logging
 */

type CopilotLogEvent =
  | "dashboard_loaded"
  | "recommendations_synced"
  | "chat_query"
  | "action_recorded"
  | "report_generated";

export function logCopilot(
  event: CopilotLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.log(
    JSON.stringify({
      tag: "[AI_COPILOT]",
      event,
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}
