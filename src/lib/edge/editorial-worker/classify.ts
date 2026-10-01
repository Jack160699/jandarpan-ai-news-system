/**
 * Error classification for worker run logs / responses (pure).
 *
 * Provider failures are classified from the adapter error code (the same codes the circuit breaker uses); pipeline
 * outcomes from the per-candidate reason string. `providerRetryable` says whether the *provider* condition is
 * transient (retry the same request later) - auth (401/403) and not-found / invalid-request (400/404) never are.
 * Candidate-level retry is separate: it is always governed by editorial_candidate_attempts backoff, never immediate.
 */

import type { ProviderCallSummary } from "@/lib/ai/providers/run-telemetry";

export type ErrorClass =
  | "provider_auth"
  | "provider_invalid_request"
  | "provider_rate_limited"
  | "provider_quota_exhausted"
  | "provider_timeout"
  | "provider_upstream"
  | "provider_unavailable"
  | "llm_budget_exhausted"
  | "invalid_output"
  | "validation_failed"
  | "quality_rejected"
  | "duplicate"
  | "unclassified";

const PROVIDER_CODE_CLASS: Record<string, { cls: ErrorClass; retryable: boolean }> = {
  ai_unauthorized: { cls: "provider_auth", retryable: false },
  ai_forbidden: { cls: "provider_auth", retryable: false },
  ai_invalid_request: { cls: "provider_invalid_request", retryable: false },
  ai_http_error: { cls: "provider_invalid_request", retryable: false },
  ai_rate_limit: { cls: "provider_rate_limited", retryable: true },
  ai_quota_exhausted: { cls: "provider_quota_exhausted", retryable: true },
  ai_timeout: { cls: "provider_timeout", retryable: true },
  ai_upstream_error: { cls: "provider_upstream", retryable: true },
  ai_network_error: { cls: "provider_upstream", retryable: true },
  ai_provider_cooldown: { cls: "provider_unavailable", retryable: true },
  ai_provider_busy: { cls: "provider_unavailable", retryable: true },
  ai_unavailable: { cls: "provider_unavailable", retryable: true },
  ai_run_budget_exhausted: { cls: "llm_budget_exhausted", retryable: true },
};

export function classifyProviderErrorCode(code: string | null | undefined): {
  errorClass: ErrorClass;
  providerRetryable: boolean;
} | null {
  if (!code) return null;
  const hit = PROVIDER_CODE_CLASS[code];
  return hit ? { errorClass: hit.cls, providerRetryable: hit.retryable } : null;
}

export function classifyCandidateReason(reason: string | null | undefined): ErrorClass {
  if (!reason) return "unclassified";
  if (reason === "RUN_BUDGET_EXHAUSTED") return "llm_budget_exhausted";
  if (reason === "DEFERRED_QUOTA") return "provider_quota_exhausted";
  if (reason === "llm_generation_failed" || reason === "model_response_did_not_form_valid_article_body") {
    return "invalid_output";
  }
  if (reason === "slug_already_exists") return "duplicate";
  if (reason.startsWith("validation_failed") || reason.includes("validation_failed")) return "validation_failed";
  if (
    reason.startsWith("quarantine:") ||
    reason.startsWith("retryable:") ||
    reason === "quality_checks_failed" ||
    reason.startsWith("dry_run_gated")
  ) {
    return "quality_rejected";
  }
  return "unclassified";
}

export type RunFailureClassification = {
  errorClass: ErrorClass;
  providerRetryable: boolean | null;
  /** The provider code that caused it, when the failure was at the provider. */
  providerErrorCode: string | null;
};

/**
 * Root cause of a run that produced no article: the LAST failed provider call wins (it is what the pipeline saw
 * last), otherwise the candidate reason.
 */
export function classifyRunFailure(input: {
  reason: string | null | undefined;
  calls: readonly ProviderCallSummary[];
}): RunFailureClassification {
  const failedCalls = input.calls.filter((c) => !c.success && c.errorCode);
  const last = failedCalls[failedCalls.length - 1];
  const fromProvider = classifyProviderErrorCode(last?.errorCode);
  const reasonClass = classifyCandidateReason(input.reason);
  // A provider failure only explains the outcome when no draft was produced; a quality reject after a successful call stays a quality reject.
  const noSuccessfulCall = input.calls.every((c) => !c.success);
  if (fromProvider && (noSuccessfulCall || reasonClass === "invalid_output")) {
    return {
      errorClass: fromProvider.errorClass,
      providerRetryable: fromProvider.providerRetryable,
      providerErrorCode: last!.errorCode,
    };
  }
  return { errorClass: reasonClass, providerRetryable: null, providerErrorCode: null };
}
