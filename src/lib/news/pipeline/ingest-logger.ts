/**
 * Structured ingest logs for Vercel + GitHub Actions observability.
 */

type IngestLogPayload = Record<string, unknown>;

function emit(tag: string, payload: IngestLogPayload, level: "log" | "warn" | "error"): void {
  const line = JSON.stringify({
    tag,
    ts: new Date().toISOString(),
    ...payload,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logIngestStart(payload: IngestLogPayload = {}): void {
  emit("[INGEST_START]", payload, "log");
}

export function logIngestSuccess(payload: IngestLogPayload = {}): void {
  emit("[INGEST_SUCCESS]", payload, "log");
}

export function logIngestFailure(payload: IngestLogPayload = {}): void {
  emit("[INGEST_FAILURE]", payload, "error");
}

export function logIngestAuthDenied(payload: IngestLogPayload = {}): void {
  emit("[INGEST_FAILURE]", { reason: "unauthorized", ...payload }, "warn");
}

export function logIngestDegraded(payload: IngestLogPayload = {}): void {
  emit("[INGEST_SUCCESS]", { degraded: true, ...payload }, "warn");
}

/** Detect quota / rate-limit signals from provider error strings */
export function detectQuotaStatus(errors: string[]): {
  rateLimited: boolean;
  quotaHints: string[];
} {
  const quotaHints = errors.filter((e) =>
    /rate|quota|429|limit|usage/i.test(e)
  );
  return {
    rateLimited: quotaHints.length > 0,
    quotaHints: quotaHints.slice(0, 5),
  };
}
