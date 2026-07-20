# Redis Verification

## Canonical variables
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

## Status
- Present in Production + Preview (Encrypted), unchanged during Step 4.
- CLI env pull redacts Sensitive values; local direct R/W not used.

## Production probe (Step4 Ops Probe workflow)
- redisConfigured: true
- health check id=redis: healthy
- Probe path uses application redisSet with short TTL (ops:health:ping) — satisfies set/get/TTL without listing unrelated keys.

## Fallback
- Cache miss / Redis unavailable degrades performance only; correctness does not depend on Redis.