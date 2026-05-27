import type { ClassifiedAiError } from "@/lib/ai/providers/types";

const INVALID_REQUEST_RE =
  /invalid_request_error|invalid_api_key|incorrect api key/i;

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
    return {
      code: "ai_rate_limit",
      message: parsed.message || "Rate limited",
      httpStatus: status,
      retryable: true,
      authFailure: false,
      invalidRequest: false,
      rateLimited: true,
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
