# CRON_CALLER_MATRIX

**Step:** 4 — Environment & Security Hardening  
**Purpose:** Map cron/authenticated callers to routes and which secrets they actually send.

## Design vs reality

| Aspect | Status |
|---|---|
| Code supports scoped secrets | Yes — `CRON_INGEST_SECRET`, `CRON_PIPELINE_SECRET`, `CRON_OPS_SECRET`, `CRON_ADMIN_SECRET` |
| Code accepts legacy fallback | Yes — `CRON_SECRET` still accepted |
| Vercel Cron Authorization | Bearer `CRON_SECRET` only (platform cannot send route-specific secrets) |
| QStash / GitHub Actions (Enterprise Workers) | Use `CRON_SECRET` |
| Complete scoped isolation | **Not claimed** — callers still send `CRON_SECRET` |

Scoped secrets are configured in Production for future isolation and defense-in-depth. While platform callers continue to present `CRON_SECRET`, isolation is **partial by design**.

## Route matrix

### Ingest (`CRON_INGEST_SECRET` preferred; `CRON_SECRET` accepted)

| Route / job | Primary caller today | Secret presented |
|---|---|---|
| `/api/cron/fetch-news` (ingest) | Vercel Cron | `CRON_SECRET` |

### Pipeline (`CRON_PIPELINE_SECRET` preferred; `CRON_SECRET` accepted)

| Route / job | Primary caller today | Secret presented |
|---|---|---|
| `/api/cron/editorial-generate` | Vercel Cron | `CRON_SECRET` |
| `/api/cron/orchestrate` | Vercel Cron | `CRON_SECRET` |
| `/api/cron/translation-backfill` | Vercel Cron | `CRON_SECRET` |
| `/api/cron/cleanup` | Vercel Cron | `CRON_SECRET` |
| `/api/cron/edition-publish` | Vercel Cron | `CRON_SECRET` |

### Ops (`CRON_OPS_SECRET` preferred; `CRON_SECRET` accepted)

| Route / job | Primary caller today | Secret presented |
|---|---|---|
| Workers health probes | Vercel Cron / Actions | `CRON_SECRET` |
| SEO-related cron routes | Vercel Cron | `CRON_SECRET` |
| `/api/health` (authenticated ops probe) | GitHub Actions `step4-ops-probe.yml` | `CRON_SECRET` (or ops secret if configured for that caller) |

### Admin (`CRON_ADMIN_SECRET` preferred; `CRON_SECRET` accepted)

| Route / job | Primary caller today | Secret presented |
|---|---|---|
| Admin bootstrap routes | Manual / controlled | Scoped or legacy (depends on caller) |
| Admin seed routes | Manual / controlled | Scoped or legacy (depends on caller) |

## Auth implementation note

- `src/lib/infrastructure/auth/cron-auth.ts` uses timing-safe comparison (`timingSafeEqual`) for secret compare.
- Scoped secret **or** legacy `CRON_SECRET` remains valid for matching route classes.

## Isolation roadmap (not Step 4 complete)

1. Keep dual-accept path until callers can send scoped secrets.
2. Migrate non-Vercel callers (Actions / QStash) to scoped secrets where platform allows.
3. Vercel Cron will remain on `CRON_SECRET` unless/until platform supports per-route secrets.
4. Do **not** remove `CRON_SECRET` acceptance while Vercel Cron depends on it.
