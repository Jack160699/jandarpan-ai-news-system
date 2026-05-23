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
