/**
 * Structured newsroom pipeline logging
 */

export type NewsroomLogContext = Record<string, unknown>;

export function logNewsroom(
  stage:
    | "signals"
    | "events"
    | "generated"
    | "editorial-image"
    | "ranking"
    | "search"
    | "bridge"
    | "pipeline",
  message: string,
  context?: NewsroomLogContext
): void {
  const payload = {
    stage,
    message,
    ...context,
    ts: new Date().toISOString(),
  };
  console.log(`[newsroom:${stage}]`, JSON.stringify(payload));
}

export function logNewsroomError(
  stage:
    | "signals"
    | "events"
    | "generated"
    | "editorial-image"
    | "ranking"
    | "search"
    | "bridge"
    | "pipeline",
  message: string,
  error: unknown,
  context?: NewsroomLogContext
): void {
  const err =
    error instanceof Error
      ? { name: error.name, message: error.message, cause: String(error.cause ?? "") }
      : { message: String(error) };

  console.error(
    `[newsroom:${stage}]`,
    JSON.stringify({ message, error: err, ...context, ts: new Date().toISOString() })
  );
}
