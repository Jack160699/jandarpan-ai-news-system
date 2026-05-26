# Jan Darpan OS — Observability Architecture

## Overview

Production observability spans structured logging, distributed request IDs, API tracing, Sentry, health probes, cron/worker monitoring, ingestion alerts, and an admin operations console.

```
┌─────────────┐     x-request-id      ┌──────────────────┐
│  Middleware │ ────────────────────► │  API Routes      │
└─────────────┘                       │  (withObservability)│
                                      └────────┬─────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │ Structured   │          │ Metrics ring │          │ Sentry       │
            │ JSON logs    │          │ (Redis/mem)  │          │ (optional)   │
            └──────────────┘          └──────────────┘          └──────────────┘
                    │                          │
                    ▼                          ▼
            ┌──────────────────────────────────────────────┐
            │  Admin: /admin/health + /api/admin/ops/*     │
            └──────────────────────────────────────────────┘
```

## Components

| Module | Path | Role |
|--------|------|------|
| Logger | `src/lib/observability/logger.ts` | JSON structured logs (`LOG_LEVEL`) |
| Request ID | `src/lib/observability/request-id.ts` | `x-request-id` propagation |
| Tracing | `src/lib/observability/tracing.ts` | Lightweight span timing |
| Metrics | `src/lib/observability/metrics.ts` | API latency, workers, DB, queues |
| Errors | `src/lib/observability/errors.ts` | Admin error ring + `ops_error_events` |
| Alerts | `src/lib/observability/alerts.ts` | Ingestion failure thresholds |
| Cron monitor | `src/lib/observability/cron-monitor.ts` | Last run per job |
| Worker monitor | `src/lib/observability/worker-monitor.ts` | Worker result hooks |
| Health checks | `src/lib/observability/health/checks.ts` | 11 subsystem probes |
| Stability score | `src/lib/observability/stability-score.ts` | Weighted production grade |

## Public health endpoint

`GET /api/health` — no auth, 15s edge cache

Checks: Supabase, OpenAI, cron workers, Realtime, Storage, vectors, queues, analytics, ingestion, Redis, homepage pool.

Returns `stability` score (0–100, grade A–F) and per-check latency.

## Admin operations APIs

| Endpoint | Permission | Purpose |
|----------|------------|---------|
| `GET /api/admin/ops/health` | `monitoring:read` | Full dashboard payload |
| `GET /api/admin/ops/errors` | `monitoring:read` | Error list + summary |
| `POST /api/admin/ops/errors` | `monitoring:read` | Client/admin error ingest |
| `GET /api/admin/ops/metrics` | `monitoring:read` | Latency + worker metrics |

## Sentry

Enable with `SENTRY_DSN` (+ optional `NEXT_PUBLIC_SENTRY_DSN` for browser).

Configs: `sentry.server.config.ts`, `sentry.client.config.ts`, `instrumentation.ts`.

High/critical ops errors are forwarded via `captureOpsException`.

## Cron & worker hooks

- `runCronOrchestration` → `recordCronRun({ job: "orchestrate" })`
- `fetch-news` → `recordCronRun({ job: "fetch-news" })`
- `runQueueWorker` → `monitorWorkerResult`
- `runScalableIngestion` → `evaluateIngestionAlert`

## Database (migration 033)

- `ops_error_events` — persisted error stream
- `ops_cron_runs` — optional cron audit (Redis primary for hot path)

## Monitoring checklist

See [PRODUCTION_OPERATIONS.md](./PRODUCTION_OPERATIONS.md).
