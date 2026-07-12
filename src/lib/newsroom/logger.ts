/**
 * Structured newsroom pipeline logging
 */

export type NewsroomLogContext = Record<string, unknown>;

function toLogString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function serializeErrorForLog(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const extra = error as Error & {
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    return {
      error: extra.name,
      message: extra.message,
      details: toLogString(extra.details),
      hint: toLogString(extra.hint),
      code: extra.code ?? null,
      stack: extra.stack ?? null,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      error: toLogString(record.name ?? record.error) ?? record.constructor?.name ?? "object",
      message: toLogString(record.message),
      details: toLogString(record.details),
      hint: toLogString(record.hint),
      code: record.code ?? null,
      stack: typeof record.stack === "string" ? record.stack : null,
    };
  }

  const text = String(error);
  return {
    error: text,
    message: text,
    details: null,
    hint: null,
    code: null,
    stack: null,
  };
}

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
  const err = serializeErrorForLog(error);

  console.error(
    `[newsroom:${stage}]`,
    JSON.stringify({ message, error: err, ...context, ts: new Date().toISOString() })
  );
}
