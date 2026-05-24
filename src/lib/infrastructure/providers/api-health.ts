/**
 * API provider health (GNews, NewsData) — auto-disable dead sources
 */

import { AGGREGATION_CONFIG } from "@/lib/news/aggregation/config";
import {
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
} from "@/lib/news/providers/circuit-breaker";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { NewsProviderId } from "@/lib/news/types";

const MAX_CONSECUTIVE_FAILURES = AGGREGATION_CONFIG.circuitFailureThreshold;
const DISABLE_MS = AGGREGATION_CONFIG.circuitCooldownMs;

export type ApiProviderHealth = {
  provider_id: string;
  last_success: string | null;
  last_failure: string | null;
  failure_count: number;
  consecutive_failures: number;
  disabled_until: string | null;
  health_score: number;
  avg_latency_ms: number;
  last_article_count: number;
};

const memory = new Map<string, ApiProviderHealth>();

export function computeHealthScore(record: ApiProviderHealth): number {
  let score = 100;
  if (record.disabled_until && new Date(record.disabled_until) > new Date()) {
    return 0;
  }
  score -= record.consecutive_failures * 25;
  score -= Math.min(30, record.failure_count * 2);
  if (!record.last_success) score -= 20;
  if (record.avg_latency_ms > 6000) score -= 15;
  if (record.last_article_count === 0 && record.last_failure) score -= 20;
  return Math.max(0, Math.min(100, score));
}

export async function loadApiProviderHealth(): Promise<
  Map<string, ApiProviderHealth>
> {
  const map = new Map<string, ApiProviderHealth>();

  if (!isSupabaseConfigured()) {
    for (const [k, v] of memory) map.set(k, v);
    return map;
  }

  try {
    const supabase = createAdminServerClient();
    const { data } = await supabase.from("api_provider_health").select("*");
    for (const row of data ?? []) {
      const r = row as ApiProviderHealth;
      r.health_score = computeHealthScore(r);
      map.set(r.provider_id, r);
    }
  } catch {
    for (const [k, v] of memory) map.set(k, v);
  }

  return map;
}

export async function isApiProviderDisabled(
  provider: NewsProviderId,
  health: Map<string, ApiProviderHealth>
): Promise<boolean> {
  if (await isCircuitOpen(provider)) return true;
  const record = health.get(provider);
  if (!record?.disabled_until) return false;
  return new Date(record.disabled_until).getTime() > Date.now();
}

export async function recordApiProviderSuccess(
  provider: NewsProviderId,
  health: Map<string, ApiProviderHealth>,
  input: { articleCount: number; latencyMs: number }
): Promise<void> {
  const prev = health.get(provider);
  const avg_latency_ms = prev
    ? Math.round(prev.avg_latency_ms * 0.5 + input.latencyMs * 0.5)
    : input.latencyMs;

  const record: ApiProviderHealth = {
    provider_id: provider,
    last_success: new Date().toISOString(),
    last_failure: prev?.last_failure ?? null,
    failure_count: prev?.failure_count ?? 0,
    consecutive_failures: 0,
    disabled_until: null,
    health_score: 0,
    avg_latency_ms,
    last_article_count: input.articleCount,
  };
  record.health_score = computeHealthScore(record);
  health.set(provider, record);
  await persistApiHealth(record);
  await recordCircuitSuccess(provider, {
    latencyMs: input.latencyMs,
    articleCount: input.articleCount,
  });
}

export async function recordApiProviderFailure(
  provider: NewsProviderId,
  health: Map<string, ApiProviderHealth>,
  errorMessage: string
): Promise<void> {
  const prev = health.get(provider);
  const consecutive = (prev?.consecutive_failures ?? 0) + 1;
  let disabled_until: string | null = null;

  if (consecutive >= MAX_CONSECUTIVE_FAILURES) {
    const until = new Date(Date.now() + DISABLE_MS);
    disabled_until = until.toISOString();
  }

  const rateLimited = /rate|quota|429/i.test(errorMessage);
  await recordCircuitFailure(provider, errorMessage, { rateLimited });

  const record: ApiProviderHealth = {
    provider_id: provider,
    last_success: prev?.last_success ?? null,
    last_failure: new Date().toISOString(),
    failure_count: (prev?.failure_count ?? 0) + 1,
    consecutive_failures: consecutive,
    disabled_until,
    health_score: 0,
    avg_latency_ms: prev?.avg_latency_ms ?? 0,
    last_article_count: 0,
  };
  record.health_score = computeHealthScore(record);
  health.set(provider, record);
  await persistApiHealth(record);
}

async function persistApiHealth(record: ApiProviderHealth): Promise<void> {
  memory.set(record.provider_id, record);
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createAdminServerClient();
    await supabase.from("api_provider_health").upsert(
      {
        provider_id: record.provider_id,
        last_success: record.last_success,
        last_failure: record.last_failure,
        failure_count: record.failure_count,
        consecutive_failures: record.consecutive_failures,
        disabled_until: record.disabled_until,
        health_score: record.health_score,
        avg_latency_ms: record.avg_latency_ms,
        last_article_count: record.last_article_count,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_id" }
    );
  } catch (err) {
    console.warn("[api-health] persist:", err);
  }
}

export async function getApiProviderHealthDashboard(): Promise<
  ApiProviderHealth[]
> {
  const health = await loadApiProviderHealth();
  const providers: NewsProviderId[] = ["gnews", "newsdata"];
  return providers.map(
    (p) =>
      health.get(p) ?? {
        provider_id: p,
        last_success: null,
        last_failure: null,
        failure_count: 0,
        consecutive_failures: 0,
        disabled_until: null,
        health_score: 50,
        avg_latency_ms: 0,
        last_article_count: 0,
      }
  );
}
