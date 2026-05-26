# Jan Darpan OS — Production Operations

## Deployment environment variables

### Required (production)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin operations |
| `CRON_SECRET` | GitHub Actions + Vercel cron auth |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |

### Recommended

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | AI enrichment + editorial |
| `GNEWS_API_KEY` / `NEWSDATA_API_KEY` | Wire providers |
| `UPSTASH_REDIS_REST_URL` | Distributed cache + rate limits |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth |
| `SENTRY_DSN` | Error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser error tracking |

### Observability tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOG_LEVEL` | `info` (prod) | `debug` \| `info` \| `warn` \| `error` |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | APM sample rate |
| `SENTRY_ENABLED` | — | Force Sentry in non-prod |
| `INGEST_ALERT_FAILURE_THRESHOLD` | `2` | Consecutive failures before alert |
| `CRON_STALE_THRESHOLD_MS` | `86400000` | Cron freshness SLA |
| `API_RATE_LIMIT_PER_MINUTE` | `120` | Per-user API ceiling |

### Cache tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOMEPAGE_CACHE_SECONDS` | `60` | Homepage feed TTL |
| `DASHBOARD_CACHE_TTL_SEC` | `45` | Dashboard aggregate TTL |
| `ANALYTICS_CACHE_TTL_SEC` | `120` | Analytics report TTL |
| `INTELLIGENCE_CACHE_TTL_SEC` | `60` | Redis intelligence TTL |
| `INTELLIGENCE_STALE_MS` | `300000` | Stale-while-revalidate threshold |

### Performance / pipeline

| Variable | Default | Purpose |
|----------|---------|---------|
| `INGEST_BUDGET_MS` | `52000` | Serverless ingest budget |
| `EDITORIAL_BATCH_LIMIT` | `6` | Editorial generation batch |
| `EDITORIAL_CONCURRENCY` | `2` | Parallel editorial jobs |
| `DB_HEALTHY_THRESHOLD` | `12` | Skip wire when DB pool healthy |

## Monitoring checklist

### Daily

- [ ] `GET /api/health` returns `ok: true`, grade ≥ B
- [ ] Admin **Health** panel shows no unhealthy checks
- [ ] Ingestion logs: last run status not `error`
- [ ] Queue backlog: AI pending &lt; 500, images &lt; 200
- [ ] Sentry: zero new critical issues

### Weekly

- [ ] Review `ops_error_events` / admin error dashboard
- [ ] RSS + API provider health scores
- [ ] Redis hit rate (cache_hit ingestion analytics)
- [ ] Stability score trend in `/api/health`
- [ ] GitHub Actions ingest workflow green

### Incident response

1. Check `/api/health` → identify failing `checks[].id`
2. Open `/admin/health` for errors + cron stale jobs
3. Verify `CRON_SECRET` + `APP_URL` in GitHub secrets
4. Check Supabase status + migration `033_ops_observability` applied
5. If ingest failing: `/admin/ingestion` + `ingestion_logs` table

## Performance improvements (implemented)

| Area | Change | Impact |
|------|--------|--------|
| Intelligence API | Stale-while-revalidate + rate limit | Fewer full rebuilds |
| Analytics API | 120s Redis cache | Lower DB aggregate load |
| Health checks | Parallel probes | Faster `/api/health` |
| Admin health UI | 60s poll (not 1s) | Reduced client load |
| Middleware | Request ID only (no extra IO) | Traceability without latency |
| Workers | Metrics + alert on failure | Faster incident detection |
| Ingest | Failure alert after N consecutive | Proactive ops signal |

## Production stability score

Computed at runtime in `/api/health` and `/api/admin/ops/health`.

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90–100 | Production-ready |
| B | 80–89 | Healthy with minor gaps |
| C | 70–79 | Degraded — address warnings |
| D | 55–69 | At risk |
| F | &lt;55 | Not production-safe |

**Factors (weighted):**

1. Core health checks (35%) — Supabase, ingestion, homepage, queues, cron
2. Env readiness (15%) — required secrets present
3. Error rate 24h (15%) — ops error ring buffer
4. Cron freshness (15%) — orchestrate, fetch-news, cluster, revalidate
5. API latency (10%) — p50/p95 from metrics samples
6. Observability stack (10%) — Redis + Sentry configured

**Target for launch:** Score ≥ 80 (grade B), all critical checks `healthy`.

## Apply database migration

```bash
# From project root (linked Supabase project)
npx supabase db push
# Or run supabase/migrations/033_ops_observability.sql in SQL editor
```

## Install Sentry (one-time)

```bash
npm install @sentry/nextjs
```

Set `SENTRY_DSN` in Vercel → redeploy.
