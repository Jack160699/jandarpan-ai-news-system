/**
 * In-memory circuit breaker — prevents retry storms and quota burn.
 * Syncs disabled state to Redis when available (multi-instance safe).
 */

import { AGGREGATION_CONFIG } from "@/lib/news/aggregation/config";
import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { NEWS_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
import type { NewsProviderId } from "@/lib/news/types";

export type CircuitSnapshot = {
  provider: string;
  consecutiveFailures: number;
  disabledUntil: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  totalSuccess: number;
  totalFailure: number;
  lastLatencyMs: number;
  lastArticleCount: number;
  lastError: string | null;
};

type CircuitState = CircuitSnapshot;

const registry = new Map<string, CircuitState>();

function circuitRedisKey(provider: string): string {
  return `${NEWS_CACHE_KEYS.providerCircuit}:${provider}`;
}

function emptyState(provider: string): CircuitState {
  return {
    provider,
    consecutiveFailures: 0,
    disabledUntil: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    totalSuccess: 0,
    totalFailure: 0,
    lastLatencyMs: 0,
    lastArticleCount: 0,
    lastError: null,
  };
}

function trimRegistry(): void {
  if (registry.size <= AGGREGATION_CONFIG.circuitMaxProviders) return;
  const oldest = [...registry.entries()].sort(
    (a, b) => (a[1].lastFailureAt ?? 0) - (b[1].lastFailureAt ?? 0)
  );
  const remove = oldest.slice(0, registry.size - AGGREGATION_CONFIG.circuitMaxProviders);
  for (const [key] of remove) registry.delete(key);
}

function getState(provider: string): CircuitState {
  let state = registry.get(provider);
  if (!state) {
    state = emptyState(provider);
    registry.set(provider, state);
  }
  return state;
}

function logDisabled(provider: string, until: number, reason: string): void {
  console.warn(
    "[PROVIDER_DISABLED]",
    JSON.stringify({
      provider,
      disabledUntil: new Date(until).toISOString(),
      cooldownMs: AGGREGATION_CONFIG.circuitCooldownMs,
      reason,
    })
  );
}

function logRecovered(provider: string): void {
  console.log(
    "[PROVIDER_RECOVERED]",
    JSON.stringify({
      provider,
      recoveredAt: new Date().toISOString(),
    })
  );
}

async function persistCircuit(state: CircuitState): Promise<void> {
  const ttl = Math.ceil(AGGREGATION_CONFIG.circuitCooldownMs / 1000) + 60;
  await cacheSetJson(circuitRedisKey(state.provider), state, ttl).catch(() => {
    /* memory-only fallback */
  });
}

async function hydrateFromRedis(provider: string): Promise<CircuitState | null> {
  try {
    const remote = await cacheGetJson<CircuitState>(circuitRedisKey(provider));
    if (remote) registry.set(provider, remote);
    return remote;
  } catch {
    return null;
  }
}

export async function isCircuitOpen(provider: NewsProviderId | string): Promise<boolean> {
  await hydrateFromRedis(provider);
  const state = getState(provider);
  const now = Date.now();

  if (!state.disabledUntil) return false;

  if (now >= state.disabledUntil) {
    const wasDisabled = state.consecutiveFailures >= AGGREGATION_CONFIG.circuitFailureThreshold;
    state.disabledUntil = null;
    state.consecutiveFailures = 0;
    registry.set(provider, state);
    if (wasDisabled) logRecovered(provider);
    await persistCircuit(state);
    return false;
  }

  return true;
}

export function isCircuitOpenSync(provider: NewsProviderId | string): boolean {
  const state = getState(provider);
  if (!state.disabledUntil) return false;
  if (Date.now() >= state.disabledUntil) {
    state.disabledUntil = null;
    state.consecutiveFailures = 0;
    return false;
  }
  return true;
}

export async function recordCircuitSuccess(
  provider: NewsProviderId | string,
  input: { latencyMs: number; articleCount: number }
): Promise<void> {
  const state = getState(provider);
  const wasOpen = Boolean(state.disabledUntil && Date.now() < state.disabledUntil);

  state.consecutiveFailures = 0;
  state.disabledUntil = null;
  state.lastSuccessAt = Date.now();
  state.lastLatencyMs = input.latencyMs;
  state.lastArticleCount = input.articleCount;
  state.totalSuccess += 1;
  state.lastError = null;

  registry.set(provider, state);
  trimRegistry();

  if (wasOpen) logRecovered(provider);
  await persistCircuit(state);
}

export async function recordCircuitFailure(
  provider: NewsProviderId | string,
  errorMessage: string,
  input?: { latencyMs?: number; rateLimited?: boolean }
): Promise<boolean> {
  const state = getState(provider);
  state.consecutiveFailures += 1;
  state.lastFailureAt = Date.now();
  state.totalFailure += 1;
  state.lastError = errorMessage.slice(0, 240);
  if (input?.latencyMs) state.lastLatencyMs = input.latencyMs;

  const threshold = AGGREGATION_CONFIG.circuitFailureThreshold;
  let opened = false;

  if (
    state.consecutiveFailures >= threshold ||
    input?.rateLimited
  ) {
    const until = Date.now() + AGGREGATION_CONFIG.circuitCooldownMs;
    if (!state.disabledUntil || until > state.disabledUntil) {
      state.disabledUntil = until;
      opened = true;
      logDisabled(
        provider,
        until,
        input?.rateLimited ? "rate_limit" : errorMessage
      );
    }
  }

  registry.set(provider, state);
  trimRegistry();
  await persistCircuit(state);
  return opened;
}

export function getCircuitSnapshots(): CircuitSnapshot[] {
  return [...registry.values()].map((s) => ({ ...s }));
}

export async function getProviderRegistryDashboard(): Promise<CircuitSnapshot[]> {
  const providers: NewsProviderId[] = ["gnews", "newsdata", "rss"];
  const out: CircuitSnapshot[] = [];
  for (const p of providers) {
    await hydrateFromRedis(p);
    out.push({ ...getState(p) });
  }
  return out;
}
