/**
 * In-memory AI provider health — avoids retry storms on bad keys.
 */

import { isLocalEnrichEnabled } from "@/lib/ai/providers/local-enrich-flag";
import type {
  AiProviderHealthSnapshot,
  AiProviderId,
  OpenAiProviderStatus,
  ProviderTelemetryPhase,
} from "@/lib/ai/providers/types";

const AUTH_COOLDOWN_MS = 15 * 60 * 1000;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

type ProviderState = {
  provider: AiProviderId;
  healthy: boolean;
  disabledUntil: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  consecutiveFailures: number;
  totalRequests: number;
  totalSuccess: number;
  totalFailure: number;
  lastLatencyMs: number;
  lastError: string | null;
  lastHttpStatus: number | null;
};

const registry = new Map<AiProviderId, ProviderState>();
let lastUnauthorizedWarningAt: number | null = null;

function emptyState(provider: AiProviderId): ProviderState {
  return {
    provider,
    healthy: true,
    disabledUntil: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    consecutiveFailures: 0,
    totalRequests: 0,
    totalSuccess: 0,
    totalFailure: 0,
    lastLatencyMs: 0,
    lastError: null,
    lastHttpStatus: null,
  };
}

function getState(provider: AiProviderId): ProviderState {
  let state = registry.get(provider);
  if (!state) {
    state = emptyState(provider);
    registry.set(provider, state);
  }
  return state;
}

export function logProviderTelemetry(
  phase: ProviderTelemetryPhase,
  payload: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({
      tag: `[${phase}]`,
      ...payload,
      ts: new Date().toISOString(),
    })
  );
}

export function isProviderHealthy(provider: AiProviderId): boolean {
  const state = getState(provider);
  if (!state.disabledUntil) return true;
  if (Date.now() >= state.disabledUntil) {
    state.disabledUntil = null;
    state.consecutiveFailures = 0;
    state.healthy = true;
    registry.set(provider, state);
    return true;
  }
  return false;
}

export function markProviderUnhealthy(
  provider: AiProviderId,
  input: {
    reason: string;
    httpStatus?: number;
    authFailure?: boolean;
    rateLimited?: boolean;
  }
): void {
  const state = getState(provider);
  const cooldownMs = input.authFailure
    ? AUTH_COOLDOWN_MS
    : input.rateLimited
      ? DEFAULT_COOLDOWN_MS
      : DEFAULT_COOLDOWN_MS;

  state.healthy = false;
  state.disabledUntil = Date.now() + cooldownMs;
  state.lastFailureAt = Date.now();
  state.consecutiveFailures += 1;
  state.totalFailure += 1;
  state.lastError = input.reason.slice(0, 240);
  state.lastHttpStatus = input.httpStatus ?? null;
  registry.set(provider, state);

  logProviderTelemetry("provider_request_failed", {
    provider,
    reason: input.reason,
    httpStatus: input.httpStatus ?? null,
    disabledUntil: new Date(state.disabledUntil).toISOString(),
    consecutiveFailures: state.consecutiveFailures,
  });

  if (provider === "openai" && input.authFailure && input.httpStatus === 401) {
    const now = Date.now();
    const shouldWarn =
      !lastUnauthorizedWarningAt || now - lastUnauthorizedWarningAt > 5 * 60 * 1000;
    if (shouldWarn) {
      lastUnauthorizedWarningAt = now;
      console.warn(
        "[AI_PROVIDER_WARNING] OpenAI unauthorized (401 invalid_api_key). Running fallback mode. Rotate OPENAI_API_KEY in runtime secrets."
      );
    }
  }
}

export function recordProviderSuccess(
  provider: AiProviderId,
  latencyMs: number
): void {
  const state = getState(provider);
  state.healthy = true;
  state.disabledUntil = null;
  state.consecutiveFailures = 0;
  state.lastSuccessAt = Date.now();
  state.lastLatencyMs = latencyMs;
  state.totalSuccess += 1;
  state.lastError = null;
  state.lastHttpStatus = null;
  registry.set(provider, state);
}

export function recordProviderRequestStarted(
  provider: AiProviderId,
  operation: string
): void {
  const state = getState(provider);
  state.totalRequests += 1;
  registry.set(provider, state);
  logProviderTelemetry("provider_request_started", { provider, operation });
}

export function recordProviderRequestCompleted(
  provider: AiProviderId,
  operation: string,
  latencyMs: number
): void {
  recordProviderSuccess(provider, latencyMs);
  logProviderTelemetry("provider_request_completed", {
    provider,
    operation,
    latencyMs,
  });
}

export function recordProviderFallback(
  from: AiProviderId,
  to: AiProviderId,
  reason: string
): void {
  logProviderTelemetry("provider_fallback_triggered", {
    from,
    to,
    reason,
  });
}

export function getAiProviderHealthSnapshots(): AiProviderHealthSnapshot[] {
  const providers: AiProviderId[] = ["openai", "openrouter", "local"];
  return providers.map((provider) => {
    const s = getState(provider);
    const now = Date.now();
    const disabled =
      s.disabledUntil !== null && now < s.disabledUntil ? s.disabledUntil : null;
    return {
      provider,
      healthy: !disabled,
      disabledUntil: disabled ? new Date(disabled).toISOString() : null,
      lastSuccessAt: s.lastSuccessAt
        ? new Date(s.lastSuccessAt).toISOString()
        : null,
      lastFailureAt: s.lastFailureAt
        ? new Date(s.lastFailureAt).toISOString()
        : null,
      consecutiveFailures: s.consecutiveFailures,
      totalRequests: s.totalRequests,
      totalSuccess: s.totalSuccess,
      totalFailure: s.totalFailure,
      lastLatencyMs: s.lastLatencyMs,
      lastError: s.lastError,
      lastHttpStatus: s.lastHttpStatus,
    };
  });
}

export function getAiProviderHealthSummary(): {
  openaiConfigured: boolean;
  openrouterConfigured: boolean;
  localEnrichEnabled: boolean;
  OPENAI_PROVIDER_STATUS: OpenAiProviderStatus;
  providers: AiProviderHealthSnapshot[];
} {
  const openai = getState("openai");
  const openrouterConfigured = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const localEnrichEnabled = isLocalEnrichEnabled();

  let OPENAI_PROVIDER_STATUS: OpenAiProviderStatus = "healthy";
  if (openai.lastHttpStatus === 401 || openai.lastHttpStatus === 403) {
    OPENAI_PROVIDER_STATUS = localEnrichEnabled ? "fallback_only" : "unauthorized";
  } else if (openai.disabledUntil && Date.now() < openai.disabledUntil) {
    OPENAI_PROVIDER_STATUS = openrouterConfigured ? "degraded" : "fallback_only";
  } else if (!openai.healthy) {
    OPENAI_PROVIDER_STATUS = "degraded";
  }

  return {
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    openrouterConfigured,
    localEnrichEnabled,
    OPENAI_PROVIDER_STATUS,
    providers: getAiProviderHealthSnapshots(),
  };
}
