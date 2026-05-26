# Jan Darpan OS — Caching Architecture

## Layers

```
Request
   │
   ▼
┌─────────────────┐   miss    ┌──────────────────┐
│ Edge headers    │ ────────► │ Upstash Redis    │
│ (s-maxage)      │           │ REST cache       │
└─────────────────┘           └────────┬─────────┘
                                       │ miss
                                       ▼
                              ┌──────────────────┐
                              │ In-process memory│
                              │ (per instance)   │
                              └────────┬─────────┘
                                       │ miss
                                       ▼
                              ┌──────────────────┐
                              │ Supabase / build │
                              └──────────────────┘
```

## Redis (Upstash)

Required env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

| Feature | Module | TTL default |
|---------|--------|-------------|
| Unified get/set | `cache/index.ts` | per-key |
| Wire micro-cache | `news/live-feed/wire-cache.ts` | 90s |
| Stale snapshots | `news/live-feed/stale-snapshot.ts` | 6h max age |
| Circuit breaker | `news/providers/circuit-breaker.ts` | cooldown |
| Dashboard snapshots | `cache/dashboard.ts` | 45s |
| Analytics reports | `cache/analytics.ts` | 120s |
| Homepage feed | `cache/homepage.ts` | `HOMEPAGE_CACHE_SECONDS` |
| Intelligence | `intelligence/snapshot-cache.ts` | 60s + DB snapshot |
| Rate limiting | `cache/rate-limit.ts` | 60s window |
| Dedup locks | `cache/dedup.ts` | per operation |
| Ops metrics/errors | `observability/*` | 1h |

## Performance patterns

### Incremental loading

Admin health dashboard polls `/api/admin/ops/health` every 60s (not sub-second).

Intelligence API serves stale snapshot immediately and enqueues background refresh via `requestSnapshotRefresh`.

### Edge caching

`edgeCacheHeaders({ sMaxAge, private })` on health, analytics, intelligence responses.

### Query batching

Health checks run in parallel via `Promise.all` in `runAllHealthChecks`.

Intelligence snapshot builder already batches Supabase reads.

### Background refresh

- Intelligence: stale-while-revalidate via job queue
- Homepage: `refreshSnapshotFromDatabase` after ingest
- Cron orchestrator: ISR revalidate when content published

### Deduplication

`withDedup(key, ttl, fn)` — coalesces in-flight expensive builds across instances (when Redis configured).

`isDuplicateRequest` — short-window idempotency for write paths.

### Rate limiting

`checkRateLimit({ key, limit, windowSec })` on intelligence API (default 120 req/min per user).

## Cache invalidation

| Event | Action |
|-------|--------|
| Editorial publish | `revalidateNewsroomCaches` |
| Ingest success | snapshot refresh + homepage cache overwrite |
| Intelligence `?refresh=1` | enqueue snapshot job |

## Without Redis

All cache modules fall back to in-process memory. Rate limits and dedup remain functional per serverless instance (weaker cross-instance guarantees).
