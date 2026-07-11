# `/api/fetch-news` — Vercel Runtime Timeout Audit

**Date:** 2026-07-11  
**Scope:** Static code audit + sample trace from `ingest-trace-run.log`  
**No code modified**

---

## Executive summary

`/api/fetch-news` is bounded by **`export const maxDuration = 60`** (Vercel hard kill) while the ingest pipeline is designed for a **52s soft budget** (`INGEST_BUDGET_MS`) with stop at **~42.6s** (`INGEST_STOP_RATIO = 0.82`). Runs that **succeed** often still report `timedOutSafely: true` — they finish under 60s with partial RSS. Runs that **fail with Vercel 504 / FUNCTION_INVOCATION_TIMEOUT** occur when work **continues past the soft stop** (especially RSS + image page fetches + large DB upserts) and post-ingest overhead pushes total wall time **past 60 seconds**.

**AI enrichment is not executed inside `fetch-news`.** Only **enqueue** to `news_ai_queue` happens (~200–400ms per provider batch). Actual AI runs later via `/api/cron/orchestrate` → `ai_enrich`.

**Editorial image queue is not processed in `fetch-news`.**

---

## Runtime limits (stacked clocks)

| Layer | Value | Source |
|-------|-------|--------|
| Vercel hard limit | **60s** | `src/app/api/fetch-news/route.ts` → `maxDuration = 60` |
| Soft ingest budget | **52,000ms** (default) | `INFRA_CONFIG.ingestBudgetMs` / `INGEST_BUDGET_MS` |
| Soft stop threshold | **~42,640ms** (52s × 0.82) | `createExecutionDeadline()` |
| Overlap lock window | **1,700s** (~28 min) | `runWorkerEndpoint("fetch-news", 1700)` |
| Provider outer timeout | **8,000ms** per retry attempt | `withProviderRetry` → `fetchWithTimeout` |
| GNews inner HTTP | **18,000ms** × 3 attempts/category | `fetchGNewsCategory` |
| NewsData inner HTTP | **20,000ms** × 3 attempts/query | `fetchNewsDataQuery` |
| RSS feed timeout | **8,000ms** per feed | `RSS_FEED_TIMEOUT_MS` |
| Article page fetch (images) | **10,000ms** per page | `extract.ts` → `FETCH_TIMEOUT_MS` |

**Mismatch:** Inner provider calls allow up to **18–20s per sub-request**, but the outer `withProviderRetry` wrapper times out the **entire** `fetchGNewsAll()` / `fetchNewsDataAll()` after **8s**. This causes retries and partial provider results — not always a timeout, but adds latency and unpredictable completion times.

---

## Pipeline stages (execution order)

```
verifyCronRequest
  → buildQueueHealthSnapshot (optional skip if backpressure)
  → runScalableIngestion(deadline)
       → bootstrapPlatformSources
       → runParallelApiProviders (GNews + NewsData)     [NO deadline check]
       → ingestProviderArticles × API providers         [NO mid-batch deadline]
       → runRssBatched (deadline between batches only)
            → onBatchComplete → ingestProviderArticles per RSS batch
       → countPendingAiQueue
       → ingestion_logs INSERT
       → refreshSnapshotFromDatabase (if inserts)
       → publishIngestCompleted / publishSignalsCreated (async)
  → revalidateNewsroomCaches (if inserts)
  → refreshSnapshotFromDatabase (duplicate, route level)
  → recordCronRun
```

---

## Total execution time breakdown by stage

### A. Typical heavy run (empirical — `ingest-trace-run.log`)

Sample run: **46,227ms** `runScalableIngestion` duration, **`timedOutSafely: true`**, 343 articles fetched, 313 legacy inserts.

| Stage | Estimated time | % of ingest | Notes |
|-------|----------------|-------------|-------|
| **0. Route preamble** | 0.5–2s | — | Auth, `buildQueueHealthSnapshot` (4× Supabase counts) |
| **1. API fetch (GNews + NewsData parallel)** | **~4.3s** | 9% | NewsData 1.3s, GNews 4.3s wall (parallel) |
| **2. GNews ingest batch** | **~2.4s** | 5% | 30 articles: image enrich + signals + legacy + AI enqueue |
| **3. NewsData ingest batch** | **~7.4s** | 16% | 30 articles: slower image enrich (page fetch failures) |
| **4. RSS batch 1** | **~16s** | 35% | 162 articles: fetch 4 feeds + enrich + 5× DB batch upserts + 162 AI enqueues |
| **5. RSS batch 2** | **~11s** | 24% | 121 articles: similar |
| **6. RSS batch 3+** | **stopped** | — | `[rss-batch] Stopping — deadline reached` at ~47s |
| **7. Post-ingest DB + snapshot** | **~3s** | 7% | `ingestion_logs`, `refreshSnapshotFromDatabase` (~245ms) |
| **8. Route post-work** | **1–3s** | — | Duplicate snapshot + `revalidateNewsroomCaches` + `recordCronRun` |
| **Total (route wall)** | **~49–55s** | 100% | Under 60s → HTTP 200 with `timedOutSafely: true` |

### B. Fast successful run (typical)

| Condition | Wall time |
|-----------|-----------|
| Overlap lock (`overlap_lock`) | **<100ms** |
| Queue backpressure skip | **<500ms** |
| Mostly duplicate RSS/API (few inserts) | **5–15s** |
| One provider disabled / empty | **10–25s** |

### C. Vercel timeout failure (inferred)

Occurs when stages 4–8 sum to **>60s** route wall:

- Extra RSS batches complete before soft stop (21 sources ÷ 4 = up to **6 batches** if deadline checks lag)
- High `maxImagePageFetches` usage (up to **10 + 8 + 6×N** page fetches per run)
- Large legacy upsert volumes (300+ rows × multiple 40-row batches)
- Slow Supabase region latency or cold starts
- **Post-deadline work** still runs (no `shouldStop()` after `runScalableIngestion` returns)

---

## Stage-by-stage detail

### 1. API fetch time (GNews, NewsData, RSS)

| Provider | Parallelism | Sub-requests | Per-request timeout | Observed (sample) |
|----------|-------------|--------------|---------------------|-------------------|
| **GNews** | 6 categories in parallel | 6 × `fetchGNewsCategory` | 18s × 3 HTTP retries each | **4,304ms** total |
| **NewsData** | 3 queries in parallel | 3 × `fetchNewsDataQuery` | 20s × 3 HTTP retries each | **1,311ms** total |
| **RSS** | 4 feeds per batch (`RSS_FEED_BATCH_SIZE`) | 21 sources → up to 6 batches | 8s per feed | **~10–16s per batch** (fetch + parse) |

**Not deadline-aware:** `runParallelApiProviders()` runs **before** any `deadline.shouldStop()` check. API phase always consumes **4–25s** depending on rate limits and retries.

**Rate-limit amplification:** Sample log shows GNews HTTP 429 with multiple retries — adds seconds even when articles eventually succeed.

### 2. AI processing time

| In `fetch-news`? | What happens | Time |
|------------------|--------------|------|
| **No inline AI** | `enqueueArticlesForAi()` inserts into `news_ai_queue` | **~300ms per 30–162 articles** |
| **Actual AI** | `processAiQueueBatch` in `/api/cron/orchestrate` | **Not in this route** |

Sample: GNews enqueue 30 rows **295ms**; RSS 162 rows **246ms**; RSS 121 rows **239ms**.

**Conclusion:** AI processing is **not** a timeout driver for `fetch-news`. Queue **enqueue** is negligible.

### 3. Database write time

Per `ingestProviderArticles` provider batch:

| Operation | Table | Batching | Sample timing |
|-----------|-------|----------|---------------|
| Signals upsert | `news_signals` | 40 rows/batch, `ignoreDuplicates` | **0.5–2.5s per 40 rows** |
| Legacy upsert | `news_articles` | 40 rows/batch, full upsert | **0.3–1.5s per 40 rows** |
| AI queue insert | `news_ai_queue` | bulk insert | **~0.3s per 100+ rows** |
| Ingestion log | `ingestion_logs` | single insert | **<0.5s** |

**Heavy RSS batch** (162 articles): **5 legacy batches + 5 signal batches ≈ 3–8s DB** alone.

Duplicate-heavy runs are faster (many `signals_upsert_zero_rows`).

### 4. Image queue time (enrichment during ingest — not editorial queue)

| Mechanism | Limit | Timeout per fetch |
|-----------|-------|-------------------|
| `enrichArticleImages` | `maxPageFetches` per provider batch (GNews **10**, NewsData **8**, RSS **6**) | **10s** per article page (`extractArticleImage`) |
| Parallelism | 6 articles at a time | |

| Provider batch | Sample enrich duration | Page fetches |
|----------------|---------------------|--------------|
| GNews (30) | ~1s | 2 page fetches |
| NewsData (30) | ~4.6s | 1 page (+ 403 failures) |
| RSS (162) | ~1.2s | 0 pages (fallbacks) |
| RSS (121) | ~1.5s | 6 pages |

**Worst case per provider batch:** `maxPageFetches × 10s` = **60–100s theoretical** if sequential page fetches saturated the limit. Parallel groups of 6 reduce wall time but can still add **15–30s** on image-heavy API batches.

**`editorial_image_queue`:** Not touched by `fetch-news`.

### 5. Queue wait time

| Mechanism | Purpose | Duration |
|-----------|---------|----------|
| `buildQueueHealthSnapshot` | 4 parallel Supabase count queries | **200–800ms** |
| `countPendingAiQueue` | End of ingest | **<200ms** |
| Overlap lock wait | N/A — second invocation **returns immediately** | **0ms** (skipped) |

No blocking wait on `worker_jobs` or AI queue drain during ingest.

---

## Which stage causes the timeout?

### Primary cause: **RSS batched ingest + per-batch `ingestProviderArticles`**

RSS runs **after** API providers and only checks `deadline.shouldStop()` **between batches**, not during `ingestProviderArticles`. Each batch can include **100–160+ articles** with full image enrich + dual DB upsert + AI enqueue.

Sample: batches at 21s and 37s; deadline stop at 47s; **batch 3+ skipped** — classic soft-timeout behavior.

### Secondary cause: **Image page enrichment on API batches**

NewsData batch took **~4.6s** on 30 articles; under worse network conditions, **10 page fetches × up to 10s** dominates.

### Tertiary cause: **Post-deadline route work**

After `runScalableIngestion` returns (even with `timedOutSafely: true`):

- `revalidateNewsroomCaches()`
- `refreshSnapshotFromDatabase(120)` — **called twice** (inside ingest + route handler)
- `recordCronRun`

Adds **1–4s** beyond ingest `durationMs`.

### Hard Vercel kill trigger

```
route_wall_time = preamble + runScalableIngestion + post_work > 60s
```

When soft stop fires mid-RSS but **the in-flight batch completes** plus post-work, wall time can exceed **60s** even though `timedOutSafely: true`.

### Why some runs succeed while others timeout

| Outcome | Typical condition |
|---------|-------------------|
| **200 OK, fast** | `overlap_lock`, backpressure skip, or mostly duplicates |
| **200 OK, `timedOutSafely: true`** | Heavy ingest completes in **46–58s**; RSS truncated |
| **504 / timeout** | Full RSS batches + heavy image fetches + slow DB + post-work **> 60s** |
| **502 no articles** | All providers failed (not a duration issue) |

---

## Should the job be split into smaller batches?

**Yes — recommended** for reliable sub-60s execution on Vercel Hobby/Pro 60s functions.

The pipeline already has natural split points:

| Split unit | Today | Problem |
|------------|-------|---------|
| API providers vs RSS | Sequential in one invocation | RSS always runs after full API ingest |
| Per RSS batch | 4 feeds → 1 `ingestProviderArticles` | Batch can be **160+ articles** — too large for one serverless slice |
| Per API provider | GNews then NewsData sequential | Each can be 30–90 articles with image fetches |

**Ideal batch boundaries (operations, not code yet):**

1. **Cron A:** API-only ingest (`runParallelApiProviders` + API `ingestProviderArticles`)
2. **Cron B:** RSS-only ingest (`runRssBatched` with **1–2 sources per invocation** or article cap)
3. **Orchestrate** (existing): drain `news_ai_queue` — already separate

Alternatively, keep one cron but cap **articles per invocation** (e.g. 50) and rely on dedupe + next cron tick for remainder.

---

## Concrete recommendations (no code changes in this audit)

### P0 — Stay under 60s without architecture change

1. **Set `INGEST_BUDGET_MS=45000` and `INGEST_STOP_RATIO=0.75`** on Vercel → soft stop at **~34s**, leaving **~26s** headroom for in-flight batch + post-work before hard 60s kill.

2. **Reduce image page fetch pressure** via env:
   - Lower per-provider caps (operational: patch `maxImagePageFetches` in code when allowed — today GNews 10, NewsData 8, RSS 6)
   - Target: **≤3 page fetches per provider batch** on 60s functions

3. **Disable legacy bridge in production** if homepage reads `generated_articles` only: `NEWSROOM_LEGACY_BRIDGE=false` cuts **half the DB writes** and AI enqueue volume per article.

4. **Ensure Redis overlap lock** is configured — prevents double ingest from QStash + Vercel cron overlapping (does not reduce single-run time but prevents compound load).

### P1 — Scheduling / platform

5. **Upgrade Vercel function `maxDuration`** to **120s or 300s** (Pro) on `/api/fetch-news` — aligns hard limit with `INGEST_BUDGET_MS=52000` design intent.

6. **Split schedules:** `fetch-news-api` (:07) and `fetch-news-rss` (:37) hitting the same route with query flag or separate thin routes — halves per-invocation work (requires future code).

### P2 — Structural (when code changes are allowed)

7. **Pass `deadline` into `ingestProviderArticles`** — abort image fetches and DB batches mid-flight when `shouldStop()`.

8. **Check `deadline.shouldStop()` before `runParallelApiProviders`** — skip API if already over budget (RSS-only recovery run).

9. **Remove duplicate `refreshSnapshotFromDatabase`** — keep only route-level or ingest-level, not both.

10. **Fix outer `withProviderRetry` 8s timeout** vs inner 18–20s fetches — align timeouts so GNews/NewsData don't retry unnecessarily.

11. **RSS batch size** — reduce `RSS_FEED_BATCH_SIZE` from 4 to **2** sources per batch when on 60s functions.

12. **Article cap per run** — stop after N new signal inserts (e.g. 50) regardless of source; remainder next cron.

### P3 — Observability

13. **Log stage timings** to `ingestion_logs.metadata` (apiMs, enrichMs, dbMs, rssMs, postMs) — today only total `duration_ms` is persisted.

14. **Alert on** `durationMs > 55000` or Vercel 504 on `fetch-news` — indicates imminent hard timeout.

---

## Reference: environment variables

| Variable | Default | Timeout impact |
|----------|---------|----------------|
| `INGEST_BUDGET_MS` | 52000 | Soft budget |
| `INGEST_STOP_RATIO` | 0.82 | When RSS stops |
| `PROVIDER_FETCH_TIMEOUT_MS` | 8000 | Outer provider wrapper |
| `RSS_BATCH_SIZE` | 4 | Feeds per RSS batch |
| `NEWSROOM_LEGACY_BRIDGE` | true | Doubles DB write path |
| `QUEUE_LIMIT_*` | various | Triggers `pauseIngestion` skip |

---

## Files reviewed

| File | Role |
|------|------|
| `src/app/api/fetch-news/route.ts` | Route, `maxDuration=60`, overlap lock |
| `src/lib/news/pipeline/scalable-ingest.ts` | Orchestrator |
| `src/lib/news/pipeline/ingest-provider-batch.ts` | Validate → images → DB → AI enqueue |
| `src/lib/news/providers/run-provider.ts` | GNews + NewsData parallel |
| `src/lib/news/providers/gnews.ts` | 6 category fetches |
| `src/lib/news/providers/newsdata.ts` | 3 query fetches |
| `src/lib/news/providers/rss-batch.ts` | Deadline between batches only |
| `src/lib/news/images/enrich.ts` | Page fetch enrichment |
| `src/lib/serverless/deadline.ts` | Soft stop logic |
| `src/lib/infrastructure/config.ts` | Budget defaults |
| `ingest-trace-run.log` | Sample timing evidence |

---

*Audit complete. No application code was modified.*
