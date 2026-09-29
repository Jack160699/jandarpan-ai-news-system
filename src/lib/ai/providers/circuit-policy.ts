/**
 * Circuit-breaker cooldown policy for AI providers (pure — unit tested).
 *
 * Health used to be in-memory with a flat 10s cooldown for anything that was
 * not an auth failure, so every cold serverless start re-probed a dead
 * provider and burned 60–90s per candidate before failing over. The policy
 * below scales the cooldown with how permanent the failure looks.
 */

import type { ClassifiedAiError } from "@/lib/ai/providers/types";

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Model-level "this model does not exist / is not available to this account". */
export function looksLikeModelUnavailable(err: {
  httpStatus?: number;
  message?: string;
  invalidRequest?: boolean;
}): boolean {
  if (err.httpStatus === 404) return true;
  if (!err.invalidRequest && err.httpStatus !== 400) return false;
  const msg = (err.message ?? "").toLowerCase();
  return (
    /model/.test(msg) &&
    /(not found|does not exist|not supported|unavailable|unknown|invalid|no access|decommission|deprecat)/.test(
      msg
    )
  );
}

export type CircuitFailureInput = Pick<
  ClassifiedAiError,
  "code" | "httpStatus" | "message" | "authFailure" | "rateLimited" | "invalidRequest"
> & { consecutiveFailures: number; dailyExhausted?: boolean; retryAfterMs?: number };

export type CircuitFailureClass =
  | "model_unavailable"
  | "auth"
  | "daily_exhausted"
  | "rate_limited"
  | "transient";

/** Milliseconds until the next 00:00:00 UTC (provider daily quotas reset on the UTC day). */
export function msUntilUtcMidnight(now: number = Date.now()): number {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(1_000, next - now);
}

export function classifyCircuitFailure(input: CircuitFailureInput): CircuitFailureClass {
  if (input.authFailure) return "auth";
  if (looksLikeModelUnavailable(input)) return "model_unavailable";
  if (input.dailyExhausted) return "daily_exhausted";
  if (input.rateLimited) return "rate_limited";
  return "transient";
}

const MAX_RETRY_AFTER_COOLDOWN_MS = HOUR;

/**
 * Cooldown before the provider/model is probed again.
 * - model_unavailable: 6h (config problem; retrying every request is pure waste)
 * - auth: 30m
 * - rate_limited: 60s doubling to 15m (per-minute windows recover fast)
 * - transient (timeout/5xx/network): 2m doubling to 30m
 */
export function circuitCooldownMs(input: CircuitFailureInput, now: number = Date.now()): number {
  const n = Math.max(1, input.consecutiveFailures);
  // A provider-supplied Retry-After is a floor (capped at 1h so a bogus header cannot park a provider).
  const floor = Math.min(input.retryAfterMs ?? 0, MAX_RETRY_AFTER_COOLDOWN_MS);
  switch (classifyCircuitFailure(input)) {
    case "model_unavailable":
      return 6 * HOUR;
    case "auth":
      return 30 * MIN;
    case "daily_exhausted":
      // Disabled until the UTC day resets: no paid probing for the rest of the day.
      return msUntilUtcMidnight(now);
    case "rate_limited":
      return Math.max(floor, Math.min(15 * MIN, MIN * 2 ** (n - 1)));
    case "transient":
    default:
      return Math.max(floor, Math.min(30 * MIN, 2 * MIN * 2 ** (n - 1)));
  }
}

/** Default wall-clock cap for one attempt against a provider (ms). */
const DEFAULT_TIMEOUT_CAPS: Record<string, number> = {
  codecraft: 60_000,
  gemini: 40_000,
  groq: 30_000,
  openai: 40_000,
  openrouter: 40_000,
};

/**
 * Per-attempt timeout: the caller's request, capped per provider so one slow
 * provider cannot eat the whole invocation budget. Override with
 * AI_PROVIDER_TIMEOUT_CAP_MS_<PROVIDER> (e.g. AI_PROVIDER_TIMEOUT_CAP_MS_GEMINI).
 */
export function effectiveTimeoutMs(
  provider: string,
  requestedMs: number | undefined,
  env: Record<string, string | undefined> = process.env
): number {
  const envCap = Number(env[`AI_PROVIDER_TIMEOUT_CAP_MS_${provider.toUpperCase()}`]);
  const cap =
    Number.isFinite(envCap) && envCap >= 5_000
      ? envCap
      : (DEFAULT_TIMEOUT_CAPS[provider] ?? 45_000);
  const requested = requestedMs && requestedMs > 0 ? requestedMs : 45_000;
  return Math.min(requested, cap);
}
