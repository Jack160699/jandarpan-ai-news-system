/**
 * In-memory AI provider health — avoids retry storms on bad keys.
 */

import { runInBackground } from "@/lib/runtime/background";
import { isLocalEnrichEnabled } from "@/lib/ai/providers/local-enrich-flag";
import { circuitCooldownMs, classifyCircuitFailure } from "@/lib/ai/providers/circuit-policy";
import type {
  AiProviderHealthSnapshot,
  AiProviderId,
  OpenAiProviderStatus,
  ProviderTelemetryPhase,
} from "@/lib/ai/providers/types";

/**
 * Cooldowns come from circuit-policy.ts and survive serverless cold starts via
 * circuit-store.ts (table ai_provider_circuit). This registry is the hot,
 * per-instance view; hydrateProviderHealth() merges the persisted state in.
 */

type ProviderState = {
  provider: HealthKey;
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

/**
 * Registry key: an AiProviderId for most providers, or a "provider:model"
 * compound string for providers with multiple distinct models sharing one
 * account (currently only Groq — see chat.ts's healthKeyFor()). This keeps
 * one model's cooldown (e.g. a 403 because the account lacks access to
 * openai/gpt-oss-120b) from poisoning every other model on the same
 * provider, which would otherwise defeat in-provider model fallback.
 */
type HealthKey = AiProviderId | (string & {});

const registry = new Map<HealthKey, ProviderState>();
let lastUnauthorizedWarningAt: number | null = null;

function emptyState(provider: HealthKey): ProviderState {
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

function getState(provider: HealthKey): ProviderState {
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

export function isProviderHealthy(provider: HealthKey): boolean {
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
  provider: HealthKey,
  input: {
    reason: string;
    httpStatus?: number;
    authFailure?: boolean;
    rateLimited?: boolean;
    invalidRequest?: boolean;
    code?: string;
    dailyExhausted?: boolean;
    retryAfterMs?: number;
  }
): void {
  const state = getState(provider);
  const consecutiveFailures = state.consecutiveFailures + 1;
  const failure = {
    code: input.code ?? "ai_failure",
    httpStatus: input.httpStatus,
    message: input.reason,
    authFailure: Boolean(input.authFailure),
    rateLimited: Boolean(input.rateLimited),
    invalidRequest: Boolean(input.invalidRequest),
    consecutiveFailures,
    dailyExhausted: Boolean(input.dailyExhausted),
    retryAfterMs: input.retryAfterMs,
  };
  const cooldownMs = circuitCooldownMs(failure);
  const failureClass = classifyCircuitFailure(failure);

  state.healthy = false;
  state.disabledUntil = Date.now() + cooldownMs;
  state.lastFailureAt = Date.now();
  state.consecutiveFailures = consecutiveFailures;
  state.totalFailure += 1;
  state.lastError = input.reason.slice(0, 240);
  state.lastHttpStatus = input.httpStatus ?? null;
  registry.set(provider, state);

  logProviderTelemetry("provider_request_failed", {
    provider,
    reason: input.reason,
    httpStatus: input.httpStatus ?? null,
    failureClass,
    cooldownMs,
    disabledUntil: new Date(state.disabledUntil).toISOString(),
    consecutiveFailures: state.consecutiveFailures,
  });
  persistProviderState(provider, state, failureClass);

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
  provider: HealthKey,
  latencyMs: number
): void {
  const state = getState(provider);
  const wasOpen = !state.healthy || state.consecutiveFailures > 0;
  state.healthy = true;
  state.disabledUntil = null;
  state.consecutiveFailures = 0;
  state.lastSuccessAt = Date.now();
  state.lastLatencyMs = latencyMs;
  state.totalSuccess += 1;
  state.lastError = null;
  state.lastHttpStatus = null;
  registry.set(provider, state);
  // Only persist when a success actually closes an open/failing circuit — keeps writes rare.
  if (wasOpen) persistProviderState(provider, state, null);
}

export function recordProviderRequestStarted(
  provider: HealthKey,
  operation: string
): void {
  const state = getState(provider);
  state.totalRequests += 1;
  registry.set(provider, state);
  logProviderTelemetry("provider_request_started", { provider, operation });
}

export function recordProviderRequestCompleted(
  provider: HealthKey,
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

export type PersistedProviderState = {
  key: string;
  disabledUntil: number | null;
  consecutiveFailures: number;
  lastError: string | null;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  failureClass?: string | null;
};

/** Fire-and-forget write of a state change; never throws, never blocks the request. */
function persistProviderState(
  key: HealthKey,
  state: ProviderState,
  failureClass: string | null
): void {
  if (process.env.VITEST || process.env.AI_CIRCUIT_PERSIST === "off") return;
  const snapshot: PersistedProviderState = {
    key,
    disabledUntil: state.disabledUntil,
    consecutiveFailures: state.consecutiveFailures,
    lastError: state.lastError,
    lastFailureAt: state.lastFailureAt,
    lastSuccessAt: state.lastSuccessAt,
    failureClass,
  };
  const work = import("@/lib/ai/providers/circuit-store")
    .then((m) => m.writeCircuitState(snapshot))
    .catch(() => undefined);
  // Keep the invocation alive until the write lands (runtime port: Next after() / Edge drain).
  runInBackground(() => work);
}

/**
 * Merge circuit state persisted by other invocations into this instance.
 * Only ever extends a cooldown / adopts a newer failure count — a locally
 * observed success is never overwritten by staler persisted state.
 */
export function mergePersistedProviderState(rows: PersistedProviderState[]): number {
  let merged = 0;
  const now = Date.now();
  for (const row of rows) {
    const state = getState(row.key);
    const persistedOpen = row.disabledUntil !== null && row.disabledUntil > now;
    const localSuccessNewer =
      state.lastSuccessAt !== null &&
      (row.lastFailureAt === null || state.lastSuccessAt > row.lastFailureAt);
    if (persistedOpen && !localSuccessNewer) {
      if (!state.disabledUntil || state.disabledUntil < row.disabledUntil!) {
        state.disabledUntil = row.disabledUntil;
        state.healthy = false;
        merged++;
      }
    }
    if (row.consecutiveFailures > state.consecutiveFailures && !localSuccessNewer) {
      state.consecutiveFailures = row.consecutiveFailures;
    }
    if (!state.lastError && row.lastError) state.lastError = row.lastError;
    if (row.lastFailureAt && (!state.lastFailureAt || row.lastFailureAt > state.lastFailureAt)) {
      state.lastFailureAt = row.lastFailureAt;
    }
    if (row.lastSuccessAt && (!state.lastSuccessAt || row.lastSuccessAt > state.lastSuccessAt)) {
      state.lastSuccessAt = row.lastSuccessAt;
    }
    registry.set(row.key, state);
  }
  return merged;
}

let lastHydratedAt = 0;
const HYDRATE_TTL_MS = 15_000;

/** Load persisted circuit state (throttled). Call at the start of any provider chain. */
export async function hydrateProviderHealth(force = false): Promise<void> {
  if (process.env.VITEST || process.env.AI_CIRCUIT_PERSIST === "off") return;
  if (!force && Date.now() - lastHydratedAt < HYDRATE_TTL_MS) return;
  lastHydratedAt = Date.now();
  try {
    const { readCircuitStates } = await import("@/lib/ai/providers/circuit-store");
    mergePersistedProviderState(await readCircuitStates());
  } catch {
    /* persistence is best-effort; in-memory state still protects this instance */
  }
}

/** Test helper. */
export function resetProviderHealthForTests(): void {
  registry.clear();
  lastHydratedAt = 0;
}

export function getAiProviderHealthSnapshots(): AiProviderHealthSnapshot[] {
  const providers: AiProviderId[] = [
    "gemini",
    "groq",
    "cloudflare",
    "openai",
    "openrouter",
    "local",
  ];
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
  codecraftConfigured: boolean;
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
    codecraftConfigured: Boolean(process.env.CODECRAFT_API_KEY?.trim()),
    localEnrichEnabled,
    OPENAI_PROVIDER_STATUS,
    providers: getAiProviderHealthSnapshots(),
  };
}
