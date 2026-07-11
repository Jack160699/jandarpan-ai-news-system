# Production Stabilization Report

**Date:** 2026-07-11  
**Deployments:** `b352a52` (dedupe fix), follow-up GNews sequential fetch  
**Production:** https://www.jandarpan.news

---

## Executive summary

Production ingest was failing the legacy bridge on every ~30-minute cycle with **Postgres error 21000** — duplicate `article_url` values inside a single `UPSERT` batch. This is now fixed at three layers (provider merge, ingest pipeline, and pre-upsert batch dedupe). The fix is **deployed and promoted to production**.

Manual cron triggers immediately after deploy returned `overlap_lock` (by design — 1,700s worker lock). The **:37 UTC cron cycle** after promote is the first live validation window for the dedupe fix.

---

## Root causes found

### 1. Legacy bridge `legacy_upsert_failed` — Postgres 21000 (PRIMARY)

| Item | Detail |
|------|--------|
| **Error** | `ON CONFLICT DO UPDATE command cannot affect row a second time` |
| **Code** | `21000` |
| **Conflict key** | `article_url` on `news_articles` |
| **Cause** | Same canonical URL appeared **twice in one upsert batch** (batch size 30–40) |
| **Source** | GNews merges 6 categories in parallel; NewsData merges 3 queries — duplicate URLs across categories/queries were not removed before `publishToLegacyArticles()` |
| **Symptom** | Logged every cron at `legacy_upsert_failed` with `batchSize: 30` (GNews/NewsData API batches) |

RSS was already deduped in `rss-batch.ts` via `dedupeArticles()` — API providers were not.

### 2. GNews HTTP 429 (SECONDARY)

| Item | Detail |
|------|--------|
| **Cause** | 6 parallel category requests + 2 retries each exceeded GNews rate limit |
| **Evidence** | `ingestion_logs.provider_errors` — 4/6 categories rate-limited per run |
| **Impact** | Partial provider data, not fatal — ingest still completes with RSS + NewsData |

### 3. Duplicate snapshot refresh (MINOR)

| Item | Detail |
|------|--------|
| **Cause** | `refreshSnapshotFromDatabase()` called in both `scalable-ingest.ts` and `fetch-news/route.ts` |
| **Impact** | ~250ms wasted per successful ingest |

### 4. Workers health 503 (PRE-EXISTING OPS)

| Item | Detail |
|------|--------|
| **Cause** | `dead_letters: 76` in job queue triggers critical health response |
| **Status** | Not introduced by this stabilization; requires separate queue cleanup run |

---

## Files modified

| File | Change |
|------|--------|
| `src/lib/news/pipeline/batch-dedupe.ts` | **NEW** — `dedupeRowsByConflictKey()` before bulk upsert |
| `src/lib/news/pipeline/batch-dedupe.test.ts` | **NEW** — unit tests (2 passing) |
| `src/lib/newsroom/bridge/legacy-publish.ts` | Canonicalize URLs; dedupe before + within each upsert batch; log counts |
| `src/lib/newsroom/signals/persist.ts` | Same dedupe for `news_signals` upsert on `article_url` |
| `src/lib/news/pipeline/ingest-provider-batch.ts` | `dedupeArticles()` after validation, before enrich |
| `src/lib/news/providers/gnews.ts` | Sequential category fetch (1 at a time, 600ms gap); post-merge dedupe; retries 1 |
| `src/lib/news/providers/newsdata.ts` | Post-merge `dedupeArticles()` |
| `src/app/api/fetch-news/route.ts` | Removed duplicate `refreshSnapshotFromDatabase()` |

**Commits:**
- `b352a52` — dedupe ingest batches before upsert
- (follow-up) — serialize GNews category fetches

---

## Database issues fixed

- **21000 ON CONFLICT** — prevented by ensuring each upsert payload has unique `article_url` values
- **Canonical URL drift** — `canonicalArticleUrl()` applied before conflict-key dedupe so `?utm_*` variants collapse
- **No schema migration required**

---

## Runtime issues fixed

| Issue | Fix |
|-------|-----|
| `legacy_upsert_failed` every 30m | Batch + provider dedupe |
| `[object Object]` error logging | Fixed in prior commit `434e506` |
| Vercel 60s timeout | Fixed in prior commit `dbad1d0` (`maxDuration=120`) |
| Duplicate snapshot refresh | Single refresh in `scalable-ingest.ts` only |
| GNews 429 | Sequential fetch + reduced retries |

---

## Duplicate prevention changes

```
Provider fetch (GNews/NewsData)
  → dedupeArticles() after merge
    → ingestProviderArticles()
      → dedupeArticles() after validation
        → persistNewsSignals() / publishToLegacyArticles()
          → dedupeRowsByConflictKey(article_url) pre-batch
            → dedupeRowsByConflictKey() per 40-row upsert slice
```

**Logging added:** `legacy_batch_deduped`, `legacy_upsert_batch_deduped`, `signals_batch_deduped`, `provider_articles_deduped` with `duplicateCount` and sample keys.

---

## Cron verification (post-deploy triggers)

| Endpoint | HTTP | Result |
|----------|------|--------|
| `/api/fetch-news` | 200 | `overlap_lock` — prior cron still within 1,700s lock window |
| `/api/cron/orchestrate` | 200 | `overlap_lock` |
| `/api/cron/edition-publish` | 200 | `outside_slot_minute` (expected outside IST :00 window) |
| `/api/cron/translation-backfill` | 200 | Enqueue-only path OK |
| `/api/cron/cleanup` | 200 | Cleaned 26 queue rows |
| `/api/cron/workers/health` | 503 | Critical: `dead_letters:76` (pre-existing) |

**Note:** `overlap_lock` is correct behavior — prevents double ingest when QStash + Vercel cron overlap.

---

## Vercel verification

| Check | Status |
|-------|--------|
| Build `dpl_5ArM4xMGMcPPMNXGWKSXCPA1BNj4` | READY |
| Promoted to production | Yes (`HpcLSrqP4eQGwRYbW94RfDQY38yR`) |
| Runtime error clusters (24h) | None grouped |
| Last `legacy_upsert_failed` | `2026-07-11T06:07:45Z` — **before** dedupe deploy |

**Post-deploy validation:** Monitor the **next scheduled `fetch-news` cron** (`:07` or `:37`) for:
- Absence of `legacy_upsert_failed` in logs
- Presence of `legacy_batch_deduped` when duplicates are collapsed
- `ingestion_logs.skipped_duplicates > 0` when provider overlap occurs

---

## Supabase verification

| Check | Status |
|-------|--------|
| `ingestion_logs` recent runs | `partial_timeout` but **572–734 inserts** per run — ingest functional |
| `ops_error_events` for 21000 | None stored |
| Postgres logs | No new constraint failures after deploy window |

Recent ingest sample (pre-fix run at 06:08 UTC):
- `inserted: 572`, `duration_ms: 42502`, `status: partial_timeout`
- GNews rate limits on 4 categories; RSS + NewsData carried load

---

## Remaining risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| GNews 429 on free/tier quota | Medium | Sequential fetch deployed; monitor `provider_errors` |
| `partial_timeout` RSS truncation | Low | Acceptable with 120s `maxDuration`; soft stop at ~42s |
| `dead_letters: 76` | Medium | Run `ops:queue-cleanup` or translation dead-letter requeue |
| Dual scheduler (QStash + Vercel) | Low | Overlap lock prevents double ingest; decommission QStash after validation |
| `workers/health` 503 | Low | Informational until dead letters cleared |

---

## Recommended future improvements

1. **Decommission QStash** after 48–72h Vercel cron validation (per `VERCEL_CRON_MIGRATION_PLAN.md`)
2. **Requeue dead translation jobs** — 76 dead letters blocking health green status
3. **Persist dedupe metrics** in `ingestion_logs.metadata` (`batch_deduped_count`)
4. **GNews quota upgrade** or reduce categories to 4 highest-yield if 429 persists
5. **Deadline inside `ingestProviderArticles`** — abort in-flight image fetches on soft stop (timeout audit P2)

---

*Stabilization cycle complete. Awaiting first post-deploy cron for `legacy_upsert_failed` absence confirmation.*
