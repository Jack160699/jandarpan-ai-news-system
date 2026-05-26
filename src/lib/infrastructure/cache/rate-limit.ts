/**
 * Upstash Redis rate limiting — sliding window per key
 */

import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { memoryCacheGet, memoryCacheSet } from "@/lib/infrastructure/cache/memory";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type WindowState = { count: number; resetAt: number };

const memoryWindows = new Map<string, WindowState>();

export async function checkRateLimit(input: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = input.windowSec * 1000;

  if (!isRedisConfigured()) {
    const state = memoryWindows.get(input.key);
    if (!state || state.resetAt <= now) {
      const resetAt = now + windowMs;
      memoryWindows.set(input.key, { count: 1, resetAt });
      return { allowed: true, remaining: input.limit - 1, resetAt };
    }
    state.count += 1;
    const allowed = state.count <= input.limit;
    return {
      allowed,
      remaining: Math.max(0, input.limit - state.count),
      resetAt: state.resetAt,
    };
  }

  const redisKey = `rl:${input.key}`;
  const raw = memoryCacheGet(redisKey);
  let state: WindowState | null = null;
  if (raw) {
    try {
      state = JSON.parse(raw) as WindowState;
    } catch {
      state = null;
    }
  }

  const { redisGet, redisSet } = await import("@/lib/infrastructure/cache/redis");
  const remoteRaw = raw ? null : await redisGet(redisKey);
  if (remoteRaw) {
    try {
      state = JSON.parse(remoteRaw) as WindowState;
    } catch {
      state = null;
    }
  }

  if (!state || state.resetAt <= now) {
    const resetAt = now + windowMs;
    const next: WindowState = { count: 1, resetAt };
    const payload = JSON.stringify(next);
    memoryCacheSet(redisKey, payload, input.windowSec);
    await redisSet(redisKey, payload, input.windowSec);
    return { allowed: true, remaining: input.limit - 1, resetAt };
  }

  state.count += 1;
  const allowed = state.count <= input.limit;
  const payload = JSON.stringify(state);
  memoryCacheSet(redisKey, payload, input.windowSec);
  await redisSet(redisKey, payload, input.windowSec);

  return {
    allowed,
    remaining: Math.max(0, input.limit - state.count),
    resetAt: state.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
