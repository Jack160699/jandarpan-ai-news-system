/**
 * Upstash Redis REST cache — optional production layer
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";

function restConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

export async function redisGet(key: string): Promise<string | null> {
  const cfg = restConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(
      `${cfg.url}/get/${encodeURIComponent(key)}`,
      {
        headers: { Authorization: `Bearer ${cfg.token}` },
        signal: AbortSignal.timeout(2_500),
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string | null };
    return json.result ?? null;
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<boolean> {
  const cfg = restConfig();
  if (!cfg) return false;

  try {
    const res = await fetch(
      `${cfg.url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?ex=${ttlSeconds}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}` },
        signal: AbortSignal.timeout(2_500),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function redisDel(key: string): Promise<void> {
  const cfg = restConfig();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/del/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}` },
      signal: AbortSignal.timeout(2_500),
    });
  } catch {
    /* ignore */
  }
}

export function isRedisConfigured(): boolean {
  return INFRA_CONFIG.redisEnabled;
}

/**
 * Atomically execute a Lua script via Upstash's REST `/eval` endpoint. Used
 * for quota reservations that must check-and-increment multiple counters as
 * a single indivisible operation (see quota.ts) — a plain GET-then-SET would
 * race under concurrent requests.
 */
export async function redisEval<T = unknown>(
  script: string,
  keys: string[],
  args: Array<string | number>
): Promise<T | null> {
  const cfg = restConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(`${cfg.url}/eval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([script, keys, args.map(String)]),
      signal: AbortSignal.timeout(2_500),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return json.result ?? null;
  } catch {
    return null;
  }
}

/** Atomic increment (can be negative) — used to reconcile estimated vs. actual usage after the fact. */
export async function redisIncrBy(key: string, amount: number): Promise<number | null> {
  const cfg = restConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(
      `${cfg.url}/incrby/${encodeURIComponent(key)}/${amount}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}` },
        signal: AbortSignal.timeout(2_500),
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: number };
    return json.result ?? null;
  } catch {
    return null;
  }
}

/** Lightweight connectivity probe for health/readiness checks. */
export async function redisPing(): Promise<{
  configured: boolean;
  reachable: boolean;
  latencyMs?: number;
}> {
  if (!isRedisConfigured()) {
    return { configured: false, reachable: false };
  }

  const started = Date.now();
  const probeKey = "ops:health:ping";
  const ok = await redisSet(probeKey, "1", 30);
  return {
    configured: true,
    reachable: ok,
    latencyMs: Date.now() - started,
  };
}
