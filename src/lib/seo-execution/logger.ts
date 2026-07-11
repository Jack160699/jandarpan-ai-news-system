/**
 * SEO Execution Engine — structured logging
 */

type ExecutionLogEvent =
  | "audit_started"
  | "audit_completed"
  | "suggestion_generated"
  | "suggestion_applied"
  | "suggestion_rejected"
  | "rollback";

export function logExecution(
  event: ExecutionLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.log(
    JSON.stringify({
      tag: "[SEO_EXECUTION]",
      event,
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}

export function errorExecution(
  event: ExecutionLogEvent,
  payload: Record<string, unknown> = {}
): void {
  console.error(
    JSON.stringify({
      tag: "[SEO_EXECUTION]",
      event,
      level: "error",
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}
