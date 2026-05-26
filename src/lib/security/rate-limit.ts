/**
 * Rate limiting — Upstash Redis with in-memory fallback
 */

import { redisGet, redisSet, isRedisConfigured } from "@/lib/infrastructure/cache/redis";

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSec: number };

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSec: number
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;

  if (isRedisConfigured()) {
    const raw = await redisGet(redisKey);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= maxAttempts) {
      return { allowed: false, retryAfterSec: windowSec };
    }
    const next = count + 1;
    await redisSet(redisKey, String(next), windowSec);
    return { allowed: true, remaining: maxAttempts - next };
  }

  const now = Date.now();
  let bucket = memoryBuckets.get(redisKey);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowSec * 1000 };
    memoryBuckets.set(redisKey, bucket);
  }

  bucket.count += 1;
  if (bucket.count > maxAttempts) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: maxAttempts - bucket.count };
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({ ok: false, error: "rate_limited", retryAfterSec }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
