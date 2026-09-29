import type { ClassifiedAiError } from "@/lib/ai/providers/types";

const INVALID_REQUEST_RE =
  /invalid_request_error|invalid_api_key|incorrect api key/i;
const EXHAUSTED_QUOTA_RE =
  /insufficient_quota|quota (?:has been )?exceeded|no credits? remaining|credit balance|billing/i;

export function isAiQuotaExhaustionMessage(message: string): boolean {
  return EXHAUSTED_QUOTA_RE.test(message);
}

/** Wording that means "your DAILY allowance / credits are gone" (as opposed to a per-minute burst limit). */
const DAILY_EXHAUSTED_RE =
  /per\s*-?\s*day|\bdaily\b|\brpd\b|\btpd\b|insufficient_quota|no credits? remaining|credit balance|billing|payment required|out of credits/i;

/**
 * True only when the provider says the DAILY budget is spent. A plain 429 / "rate limit" (per-minute)
 * is NOT daily-exhausted — it recovers within the minute and must not disable a provider for hours.
 * HTTP 402 (payment required) is always treated as daily-exhausted.
 */
export function detectDailyExhaustion(status: number | undefined, message: string): boolean {
  if (status === 402) return true;
  if (status !== undefined && status !== 429 && status !== 200) return false;
  return DAILY_EXHAUSTED_RE.test(message ?? "");
}

const MAX_RETRY_AFTER_MS = 24 * 3_600_000;

/** Parse a Retry-After header: delta-seconds (may be fractional) or an HTTP-date. Returns ms, or undefined. */
export function parseRetryAfterMs(
  value: string | null | undefined,
  now: number = Date.now()
): number | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const ms = Math.round(Number(raw) * 1000);
    return Number.isFinite(ms) && ms >= 0 ? Math.min(ms, MAX_RETRY_AFTER_MS) : undefined;
  }
  const at = Date.parse(raw);
  if (Number.isNaN(at)) return undefined;
  return Math.min(Math.max(0, at - now), MAX_RETRY_AFTER_MS);
}

/** Add Retry-After and daily-exhaustion hints to an already-classified provider failure. */
export function withRateLimitHints(
  err: ClassifiedAiError,
  headers: { get(name: string): string | null } | null | undefined,
  now: number = Date.now()
): ClassifiedAiError {
  const retryAfterMs = parseRetryAfterMs(headers?.get("retry-after"), now);
  const dailyExhausted = detectDailyExhaustion(err.httpStatus, err.message);
  if (retryAfterMs === undefined && !dailyExhausted) return err;
  return {
    ...err,
    ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    ...(dailyExhausted ? { dailyExhausted: true, retryable: false, rateLimited: true } : {}),
  };
}

export function parseOpenAiErrorBody(body: string): {
  message: string;
  type?: string;
  code?: string;
} {
  try {
    const json = JSON.parse(body) as {
      error?: { message?: string; type?: string; code?: string };
    };
    return {
      message: json.error?.message?.slice(0, 240) ?? body.slice(0, 240),
      type: json.error?.type,
      code: json.error?.code,
    };
  } catch {
    return { message: body.slice(0, 240) };
  }
}

export function classifyAiHttpFailure(
  status: number,
  bodySnippet: string
): ClassifiedAiError {
  const parsed = parseOpenAiErrorBody(bodySnippet);
  const invalidRequest =
    status === 400 &&
    (parsed.type === "invalid_request_error" ||
      INVALID_REQUEST_RE.test(parsed.message));

  if (status === 401 || status === 403) {
    return {
      code: status === 401 ? "ai_unauthorized" : "ai_forbidden",
      message: parsed.message || `HTTP ${status}`,
      httpStatus: status,
      retryable: false,
      authFailure: true,
      invalidRequest: false,
      rateLimited: false,
    };
  }

  if (invalidRequest) {
    return {
      code: "ai_invalid_request",
      message: parsed.message,
      httpStatus: status,
      retryable: false,
      authFailure: false,
      invalidRequest: true,
      rateLimited: false,
    };
  }

  if (status === 429) {
    const exhaustedQuota =
      parsed.code === "insufficient_quota" ||
      parsed.type === "insufficient_quota" ||
      isAiQuotaExhaustionMessage(parsed.message);
    return {
      code: exhaustedQuota ? "ai_quota_exhausted" : "ai_rate_limit",
      message: parsed.message || "Rate limited",
      httpStatus: status,
      retryable: !exhaustedQuota,
      authFailure: false,
      invalidRequest: false,
      rateLimited: !exhaustedQuota,
    };
  }

  if (status >= 500) {
    return {
      code: "ai_upstream_error",
      message: parsed.message || `HTTP ${status}`,
      httpStatus: status,
      retryable: true,
      authFailure: false,
      invalidRequest: false,
      rateLimited: false,
    };
  }

  return {
    code: "ai_http_error",
    message: parsed.message || `HTTP ${status}`,
    httpStatus: status,
    retryable: false,
    authFailure: false,
    invalidRequest: false,
    rateLimited: false,
  };
}

export function classifyAiNetworkError(err: unknown): ClassifiedAiError {
  if (err instanceof Error && err.name === "AbortError") {
    return {
      code: "ai_timeout",
      message: "Request timed out",
      retryable: true,
      authFailure: false,
      invalidRequest: false,
      rateLimited: false,
    };
  }
  const message =
    err instanceof Error ? err.message.slice(0, 240) : "AI request failed";
  return {
    code: "ai_network_error",
    message,
    retryable: true,
    authFailure: false,
    invalidRequest: false,
    rateLimited: false,
  };
}
