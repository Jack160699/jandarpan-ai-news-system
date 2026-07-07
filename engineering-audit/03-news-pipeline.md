# Phase 3 — News Pipeline Audit

**Project:** Jandarpan.news (`newspaper-motion`)  
**Date:** 2026-07-07  
**Scope:** READ-ONLY audit of the complete pipeline from source ingestion to homepage publication  
**Prior phases:** Phase 1 (architecture) and Phase 2 (database) complete — not repeated here

---

## Executive Summary

The news pipeline is a **multi-scheduler, event-driven system** centered on `runScalableIngestion` → `news_signals` → clustering → `editorial_generate` → `generated_articles` → homepage ISR/Redis. Production is driven primarily by **Upstash QStash** (~180 scheduled HTTP invocations/day); Vercel crons act as backup for ingest/editorial and **duplicate** cleanup and translation-backfill schedules.

**Strengths:** Single canonical ingest path, URL-based dedup at DB layer, overlap locks on workers, event-bus job dedupe keys, editorial image queue uses atomic `SKIP LOCKED` RPC, ingest deadline budgeting.

**Top risks:**

| Area | Issue | Impact |
|------|-------|--------|
| OpenAI cost | Prompt cache table missing; repair/translation bypass central cache | ~100% cache miss rate; duplicate LLM calls |
| AI queue | Non-atomic claim + ignored backoff | Duplicate enrichment; hot retry loops |
| Editorial | Triple trigger (cron + event bus + job handler) | Redundant LLM on same events |
| Homepage | Pool fetched/ranked 2–3× per ISR miss; live poll rebuilds full feed | High serverless + Supabase load |
| Cache | Redis key mismatch on revalidate | Stale homepage up to TTL (60s default) |
| Translation | Five overlapping trigger paths | Repeated OpenAI translation calls |
| Crons | Cleanup fired twice daily at identical time | Double retention RPC |

**Pipeline readiness score: 58%** — functional but expensive under load; cost and cache fixes are highest ROI.

**No code, migrations, or commits were made in this phase.**

---

## Pipeline Architecture

```mermaid
flowchart LR
  subgraph ingest [Ingest every 30m]
    Q1[QStash fetch-news] --> SI[runScalableIngestion]
    SI --> GNews[GNews API]
    SI --> ND[NewsData API]
    SI --> RSS[RSS batches]
    GNews & ND & RSS --> SIG[news_signals]
    SIG --> LEG[news_articles bridge]
    LEG --> AIQ[news_ai_queue]
    SI --> EB[ingest.completed event]
  end

  subgraph post [Post-ingest every 30m]
    EB --> EG[editorial_generate job]
    CRON_EG[QStash editorial_generate] --> GEN[generateEditorialsFromEvents]
    EG --> JP[job_processor] --> GEN
    ORCH[QStash orchestrate] --> AIE[ai_enrich]
    ORCH --> JP
    ORCH --> IMG[editorial_images]
    EB --> CL[event_cluster]
  end

  subgraph publish [Publish + Serve]
    GEN --> GA[generated_articles]
    GA --> TR[translation paths x5]
    GA --> IMGQ[editorial_image_queue]
    GA --> HP[getGeneratedHomepageFeed]
    HP --> RANK[rankArticlesForHomepage]
    POLL[/api/homepage/live] --> RANK
  end
```

---

## Scheduler Inventory

### QStash (primary) — `scripts/setup-qstash-schedules.mjs`

| Schedule | Cron (UTC) | Target | Retries |
|----------|------------|--------|---------|
| `jandarpan-fetch-news` | `7,37 * * * *` | `POST /api/fetch-news` | 3 |
| `jandarpan-editorial-generate` | `10,40 * * * *` | `POST /api/cron/worker/editorial_generate` | 3 |
| `jandarpan-orchestrate` | `15,45 * * * *` | `POST /api/cron/orchestrate` | 3 |
| `jandarpan-workers-health` | `0 * * * *` | `GET /api/cron/workers/health` | 3 |
| `jandarpan-translation-backfill` | `20 */6 * * *` | `POST /api/cron/translation-backfill` | 3 |
| `jandarpan-data-cleanup` | `30 3 * * *` | `POST /api/cron/cleanup` | 3 |

### Vercel (backup) — `vercel.json`

| Path | Cron (UTC) | Notes |
|------|------------|-------|
| `/api/fetch-news` | `15 0 * * *` | Daily backup |
| `/api/cron/worker/editorial_generate` | `45 0 * * *` | Daily backup |
| `/api/cron/translation-backfill` | `0 */6 * * *` | **Overlaps QStash** (8 runs/day combined) |
| `/api/cron/cleanup` | `30 3 * * *` | **Exact duplicate** of QStash |

### Unscheduled (manual / GHA only)

`/api/cron/cluster`, `/api/cron/jobs`, `/api/cron/revalidate`, `/api/process-ai`, `/api/process-editorial-images`, `/api/generate-articles`

---

## Findings

### 1. Ingestion (RSS, GNews, NewsData)

#### P-001 — No cross-provider in-memory dedup before DB

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `runScalableIngestion` calls `ingestProviderArticles` per provider sequentially. GNews and NewsData run in parallel fetch but ingest separately. Only RSS batches call `dedupeArticles` pre-insert. |
| **Estimated impact** | Extra DB round-trips and signal rows attempted for duplicate URLs across GNews/NewsData; mitigated by `news_signals.article_url` unique + `ignoreDuplicates`. ~5–15% redundant writes on overlapping headlines. |
| **Recommended fix** | Merge API provider articles through `dedupeArticles` once before split ingest, or single combined batch. |
| **Files involved** | `src/lib/news/pipeline/scalable-ingest.ts`, `src/lib/news/providers/run-provider.ts`, `src/lib/news/normalize.ts` |

#### P-002 — GNews API + Google News RSS overlap

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `fetchGNewsAll` (GNews API) and RSS catalog (`rss-sources.ts` includes `gnews-cg-en` Google News feeds) ingest overlapping Chhattisgarh stories. |
| **Estimated impact** | Duplicate fetch + DB skip per run; wasted provider quota and ~2× API calls for same stories. |
| **Recommended fix** | Remove Google News RSS entries where GNews API covers same geography, or exclude GNews API when RSS Google feeds enabled. |
| **Files involved** | `src/lib/news/providers/gnews.ts`, `src/lib/news/providers/rss-sources.ts`, `src/lib/news/providers/rss-batch.ts` |

#### P-003 — Live wire fallback duplicates provider API calls

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | When DB pool &lt; `dbCriticalThreshold` (default 3), `resolveLiveArticlePool` calls `fetchWireArticlesUncached` which re-fetches GNews/NewsData/RSS for display only. |
| **Estimated impact** | Extra provider API calls during low-pool periods; no DB writes but increases rate-limit risk and serverless time. Micro-cache TTL 90s limits but does not eliminate. |
| **Recommended fix** | Serve stale snapshot only; trigger emergency ingest job instead of synchronous wire fetch on homepage path. |
| **Files involved** | `src/lib/news/live-feed/resolve-pool.ts`, `src/lib/news/live-feed/fetch-wire-display.ts`, `src/lib/news/aggregation/config.ts` |

#### P-004 — Per-provider-batch homepage revalidation during ingest

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `ingestProviderArticles` calls `revalidateLiveHomepage()` when `inserted > 0` for **each** provider batch. A single ingest run processes GNews + NewsData + N RSS batches → up to **7+ revalidations** per 30-minute cycle, plus `fetch-news` route revalidates again at end. |
| **Estimated impact** | 5–10× redundant ISR tag invalidations + Redis deletes per ingest run; unnecessary serverless cold starts on edge revalidation. |
| **Recommended fix** | Defer revalidation to end of `runScalableIngestion` only; pass `revalidateHome: false` to per-batch ingest. |
| **Files involved** | `src/lib/news/pipeline/ingest-provider-batch.ts`, `src/lib/news/pipeline/scalable-ingest.ts`, `src/app/api/fetch-news/route.ts`, `src/lib/news/revalidate-home.ts` |

#### P-005 — Legacy `news_articles` upsert updates on duplicate URL

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `publishToLegacyArticles` upserts without `ignoreDuplicates`; duplicate URLs update existing rows while `news_signals` skips. |
| **Estimated impact** | Extra write amplification on repeat ingest; homepage primary path uses `generated_articles` not `news_articles`. |
| **Recommended fix** | Align legacy bridge with signal semantics or disable bridge when `generated_articles` is sole public source. |
| **Files involved** | `src/lib/newsroom/bridge/legacy-publish.ts`, `src/lib/news/pipeline/ingest-provider-batch.ts` |

#### P-006 — Dead ingestion code paths

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `fetchAllNewsProviders` and `runIngestionPipeline` have no callers but remain in repo. |
| **Estimated impact** | Maintenance confusion only. |
| **Recommended fix** | Remove or mark deprecated in docs (Phase 1 may have left these). |
| **Files involved** | `src/lib/news/providers/index.ts`, `src/lib/news/pipeline/ingest.ts` |

#### P-007 — Ingest revalidates on legacy inserts only, not signals

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `fetch-news` revalidates when `result.inserted > 0` (legacy bridge) but snapshot refresh also runs on `signalsInserted > 0`. Homepage may not ISR-bust when only signals added. |
| **Estimated impact** | Rare edge case when legacy bridge off; signals-only ingest may not refresh homepage until editorial publishes. |
| **Recommended fix** | Revalidate when `signalsInserted > 0` OR unify metrics. |
| **Files involved** | `src/app/api/fetch-news/route.ts`, `src/lib/news/pipeline/scalable-ingest.ts` |

#### P-008 — Dual snapshot refresh on ingest

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `scalable-ingest.ts` and `fetch-news/route.ts` both call `refreshSnapshotFromDatabase(120)` after ingest. |
| **Estimated impact** | 2× Supabase pool queries + Redis snapshot write per successful ingest. |
| **Recommended fix** | Single refresh at orchestration boundary. |
| **Files involved** | `src/lib/news/pipeline/scalable-ingest.ts`, `src/app/api/fetch-news/route.ts`, `src/lib/news/live-feed/resolve-pool.ts` |

---

### 2. Clustering & Deduplication

#### P-009 — Clustering triggered multiple ways, `/api/cron/cluster` unscheduled

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `ingest.completed` enqueues `event_cluster` job; `event_cluster` worker runs `clusterRecentSignals`. `/api/cron/cluster` exists for manual recovery but is not in QStash or Vercel. |
| **Estimated impact** | Clustering depends on event-bus delivery + orchestrate `job_processor`; no hourly safety net if jobs stall. |
| **Recommended fix** | Add low-frequency QStash schedule for cluster recovery OR document ops runbook. |
| **Files involved** | `src/lib/infrastructure/events/event-bus.ts`, `src/app/api/cron/cluster/route.ts`, `src/lib/news/ai/event-clustering.ts` |

#### P-010 — Dual embedding pipelines for signals

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | When `NEWSROOM_USE_EMBEDDINGS=true`, `event-clustering.ts` `fetchEmbeddings` calls OpenAI directly. `signals.created` also enqueues `embed_signals` → `embedTextsSafe` in intelligence layer. |
| **Estimated impact** | 2× embedding API cost per signal batch when both paths active; ~$0.0001/signal × volume. |
| **Recommended fix** | Single embedding path: clustering reads from `intelligence_embeddings` or disable inline clustering embeddings. |
| **Files involved** | `src/lib/news/ai/event-clustering.ts`, `src/lib/infrastructure/events/event-bus.ts`, `src/lib/intelligence/vector/embeddings.ts` |

#### P-011 — Full-table signal ID scan for clustering

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `fetchUnprocessedSignals` loads all `news_events.signal_ids` into memory to build processed set. |
| **Estimated impact** | O(events) memory + query cost; grows with `news_events` table (~2,784 rows today, unbounded). |
| **Recommended fix** | SQL `NOT EXISTS` or left-anti-join for unclustered signals with `created_at` window. |
| **Files involved** | `src/lib/news/ai/event-clustering.ts` |

#### P-012 — O(n²) pairwise clustering at scale

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `clusterSignalsLocally` compares up to 120 signals pairwise (Jaccard + optional cosine). |
| **Estimated impact** | ~7k comparisons per run today; acceptable. Becomes expensive if limit raised without indexing. |
| **Recommended fix** | Keep default limit; use pgvector `match_intelligence_embeddings` for scale. |
| **Files involved** | `src/lib/news/ai/event-clustering.ts` |

---

### 3. AI Queue & Enrichment

#### P-013 — Non-atomic AI queue claim (race condition)

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Root cause** | `claimAiQueueBatch` does SELECT pending rows then UPDATE to `processing`. No `FOR UPDATE SKIP LOCKED`. Concurrent `ai_enrich` worker + `/api/process-ai` + orchestrate can claim overlapping article sets. |
| **Estimated impact** | Duplicate `enrichArticle` OpenAI calls for same `news_articles` row; 2× cost on race (~low probability per article but 48 orchestrate runs/day increases exposure). |
| **Recommended fix** | Add `claim_ai_queue_batch` RPC mirroring `claim_editorial_image_batch` pattern. |
| **Files involved** | `src/lib/news/ai/queue.ts`, `src/lib/news/ai/process.ts`, `supabase/migrations/006_news_ai_queue.sql` |

#### P-014 — AI queue backoff metadata ignored on claim

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `markAiQueueOutcome` sets `status: "pending"` with `nextRetryAt` in `error` JSON. `claimAiQueueBatch` filters only `status = "pending"` without checking `nextRetryAt`. |
| **Estimated impact** | Immediate hot retries instead of 60s–600s backoff; up to **8 OpenAI calls** per article (2 provider retries × 4 queue attempts) without cooling period. |
| **Recommended fix** | Add `scheduled_at` column or filter `parseAiQueueRetryMeta` in claim query. |
| **Files involved** | `src/lib/news/ai/ai-queue-retry.ts`, `src/lib/news/ai/queue.ts` |

#### P-015 — Legacy `/api/process-ai` overlaps orchestrate `ai_enrich`

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `POST /api/process-ai` drains same queue as orchestrate worker; not scheduled but callable manually; revalidates homepage on any processing. |
| **Estimated impact** | Race with P-013; unnecessary revalidation when enrichment succeeds but nothing published. |
| **Recommended fix** | Deprecate endpoint or guard with overlap lock; remove revalidate unless publish occurred. |
| **Files involved** | `src/app/api/process-ai/route.ts`, `src/lib/infrastructure/cron/orchestrator.ts` |

#### P-016 — `promoteRetryReadyAiQueueItems` N+1 updates

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | Scans up to 200 failed rows; per-row UPDATE in loop. Called from `claimAiQueueBatch` and `processAiQueueBatch`. |
| **Estimated impact** | Up to 400 extra queries per AI batch under failure backlog. |
| **Recommended fix** | Batch SQL `UPDATE … WHERE id IN (…)` for ready retries. |
| **Files involved** | `src/lib/news/ai/ai-queue-retry.ts`, `src/lib/news/ai/process.ts` |

#### P-017 — Parallel micro-batch enrichment spikes OpenAI rate limits

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `processAiQueueBatch` uses `Promise.allSettled` on micro-batch (default 10 concurrent `enrichArticle` calls). |
| **Estimated impact** | Burst traffic during orchestrate; may trigger 429s → retry amplification (P-014). |
| **Recommended fix** | Tune `microBatchSize` via env; consider semaphore. |
| **Files involved** | `src/lib/news/ai/process.ts`, `src/lib/infrastructure/queue/tuning.ts` |

#### P-018 — `ai_enrich` inner loop up to 8 batches per orchestrate run

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `runAiWorker` loops until deadline or empty queue (`maxLoops = 8`). |
| **Estimated impact** | Good throughput; can consume full 52s orchestrate budget leaving no time for `editorial_images`. |
| **Recommended fix** | Reserve budget split between workers (already partially done via deadline skip). |
| **Files involved** | `src/lib/infrastructure/workers/registry.ts`, `src/lib/infrastructure/cron/orchestrator.ts` |

---

### 4. AI Generation (Editorial)

#### P-019 — Triple editorial_generate trigger

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | (1) QStash cron every 30m → `runEditorialWorker` → `generateEditorialsFromEvents`. (2) `ingest.completed` event → `editorial_generate` job → `job_processor` → same function. (3) Job handler also schedules translation batch on publish. Cron path bypasses `worker_jobs` dedupe. |
| **Estimated impact** | Up to 2 editorial runs within minutes of ingest (:10/:40 cron vs :15/:45 orchestrate delivering ingest jobs). Mitigated by `usedEventIds` skip for already-generated events, but still wastes LLM calls evaluating events. ~$0.02–0.08 per skipped candidate × concurrency. |
| **Recommended fix** | Single trigger: event-bus only after ingest, OR cron only with overlap lock keyed to `editorial_generate`. |
| **Files involved** | `src/lib/infrastructure/events/event-bus.ts`, `src/lib/infrastructure/workers/registry.ts`, `src/lib/infrastructure/jobs/handlers.ts`, `scripts/setup-qstash-schedules.mjs` |

#### P-020 — Borderline repair bypasses prompt cache

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `regenerateIntroSection` in `editorial-repair.ts` uses raw `fetch` to OpenAI, not `requestChatCompletion`. |
| **Estimated impact** | Every borderline draft gets uncached second LLM call (~1k–4.5k input tokens). ~15–30% of candidates may hit repair path. |
| **Recommended fix** | Route through `requestChatCompletion` with `operation: "editorial_repair"`. |
| **Files involved** | `src/lib/news/ai/editorial-repair.ts`, `src/lib/ai/providers/chat.ts`, `src/lib/observability/openai-cost/call-sites.ts` |

#### P-021 — Prompt cache table missing in production

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Root cause** | Migration 042 marked applied but `openai_prompt_cache` table absent (Phase 2 finding). `lookupPromptCache` catches errors → `{ hit: false }`. |
| **Estimated impact** | **100% cache miss** on all `requestChatCompletion` paths; duplicate prompts across ai_enrich, editorial, translation pay full price. Estimated 20–40% potential savings lost. |
| **Recommended fix** | Restore table on production; verify hit rate in dashboard. |
| **Files involved** | `src/lib/observability/openai-cost/prompt-cache.ts`, `src/lib/ai/providers/chat.ts`, `supabase/migrations/042_openai_prompt_cache.sql` |

#### P-022 — Per-entity cache keys prevent cross-article dedup

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `computePromptCacheKey` includes `articleId` and `eventId`. Identical wire summaries for different articles never share cache. |
| **Estimated impact** | Lower cache hit rate for `ai_enrich` where prompts differ only by ID suffix. |
| **Recommended fix** | Hash-only key for idempotent operations (`ai_enrich`, `translate`); keep entity scope for editorial. |
| **Files involved** | `src/lib/observability/openai-cost/prompt-cache.ts` |

#### P-023 — Post-publish translation burst on auto-generate

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `persistGeneratedArticle` calls `void translateGeneratedArticle()` inline for default **5 languages** per auto-published article. |
| **Estimated impact** | Largest single-article OpenAI multiplier: 1 editorial + 5 translation = **6 chat calls** minimum per publish. ~$0.03–0.15/article depending on length. |
| **Recommended fix** | Queue-only translation via event bus; remove inline translate on auto-publish. |
| **Files involved** | `src/lib/news/ai/generate-article.ts`, `src/lib/i18n/multilingual/translate.ts` |

#### P-024 — LLM called before pre-check gates on rejected candidates

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `generateEditorialsFromEvents` → `prepareCandidate` always calls `callEditorialLlm` before full guard evaluation can short-circuit weak events. |
| **Estimated impact** | OpenAI spend on events that fail confidence/quality gates post-LLM. |
| **Recommended fix** | Pre-filter events by signal count, source reputation, or fact-pack size before LLM. |
| **Files involved** | `src/lib/news/ai/generate-article.ts`, `src/lib/news/ai/editorial-guards.ts` |

#### P-025 — Optional shorts LLM adds +1 call per article

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `NEWSROOM_AUTO_SHORTS=true` triggers `buildNewsShortForArticle` additional LLM call. |
| **Estimated impact** | +1 call/article when enabled. |
| **Recommended fix** | Batch shorts generation or derive from headline. |
| **Files involved** | `src/lib/news/ai/generate-article.ts` |

---

### 5. Image Generation

#### P-026 — Nested image repair × queue retry (up to ~12 DALL-E calls)

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `resolveEditorialHeroImage` runs up to `maxRepairAttempts+1` (default 4) DALL-E attempts per queue item. Queue allows 3 attempts with backoff. |
| **Estimated impact** | Worst case ~12 image API calls per article; $0.04–0.48/article at DALL-E pricing. |
| **Recommended fix** | Accept terminal fallback after N in-process repairs without queue retry; or cap total attempts globally. |
| **Files involved** | `src/lib/news/ai/generate-editorial-image.ts`, `src/lib/news/ai/editorial-image-queue.ts` |

#### P-027 — Queue retry scheduled when non-AI fallback already usable

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `processQueueItem` schedules `ai_fallback_retry_scheduled` when AI enabled and source is `source_extracted` even if image is acceptable. |
| **Estimated impact** | Extra queue cycles and potential duplicate generation attempts. |
| **Recommended fix** | Mark terminal success for acceptable fallback sources. |
| **Files involved** | `src/lib/news/ai/generate-editorial-image.ts`, `src/lib/news/ai/editorial-image-queue.ts` |

#### P-028 — `editorial_images` deprioritized in orchestrate deadline

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `INTELLIGENCE_PIPELINE` runs `editorial_images` last; skipped when budget &lt; 15s (`editorialImagesDeadlineThresholdMs`). Prior workers consume 52s budget. |
| **Estimated impact** | Image backlog grows; articles publish without heroes until dedicated run. |
| **Recommended fix** | Separate QStash schedule for images OR reduce ai_enrich loop budget. |
| **Files involved** | `src/lib/infrastructure/cron/orchestrator.ts`, `src/lib/infrastructure/workers/registry.ts` |

#### P-029 — `enqueueEditorialImage` upsert resets completed work

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | Upsert always sets `status: "pending"`, `attempts: 0` on conflict. |
| **Estimated impact** | Accidental re-enqueue regenerates images; extra DALL-E cost. |
| **Recommended fix** | Conditional upsert: only reset if `forceRegenerate` flag. |
| **Files involved** | `src/lib/news/ai/editorial-image-queue.ts` |

#### P-030 — Editorial image batch N+1 context loads

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `batchLoadArticleContexts` calls `getQueueRowForArticle` per article in parallel. |
| **Estimated impact** | N Supabase queries per image batch (default small batch). |
| **Recommended fix** | Single `.in("article_id", ids)` query. |
| **Files involved** | `src/lib/news/ai/generate-editorial-image.ts` |

---

### 6. Translation

#### P-031 — Five overlapping translation triggers

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | (1) Inline `translateGeneratedArticle` on auto-publish. (2) `publishArticlePublished` → `enqueueTranslationsForPublishedArticle` on desk publish. (3) `scheduleMissingTranslations` on every homepage feed build (max 12). (4) 6h `translation-backfill` cron. (5) `translation_batch` self-reschedule while backlog remains. |
| **Estimated impact** | Same article/language may be translated 2–3× if inline + queue + homepage scheduler overlap. In-process dedupe (`inFlight` + 10min cooldown) helps but does not cover inline vs queue. |
| **Recommended fix** | Single path: queue-only with dedupe key `translate:{articleId}:{lang}`. |
| **Files involved** | `src/lib/news/ai/generate-article.ts`, `src/lib/infrastructure/events/event-bus.ts`, `src/lib/i18n/multilingual/translation-queue.ts`, `src/lib/i18n/multilingual/ensure-translation.ts`, `src/lib/homepage/get-feed.ts`, `src/app/api/cron/translation-backfill/route.ts` |

#### P-032 — Translation backfill runs 8×/day (dual schedulers)

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | QStash `20 */6 * * *` + Vercel `0 */6 * * *` — same endpoint, 20 minutes apart. |
| **Estimated impact** | 8 cron invocations/day; each runs audit (6+ count queries) + `processJobBatch(8)` + DLQ requeue. |
| **Recommended fix** | Remove from `vercel.json` or QStash; keep single scheduler. |
| **Files involved** | `vercel.json`, `scripts/setup-qstash-schedules.mjs`, `src/app/api/cron/translation-backfill/route.ts` |

#### P-033 — `translation_batch` self-reschedule chain

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | Handler re-enqueues `translation_batch` when `remaining > enqueued`. |
| **Estimated impact** | Sustained job chain during backlog; competes with orchestrate `job_processor` for same queue. |
| **Recommended fix** | Cap chain depth per cron window; rely on next scheduled backfill. |
| **Files involved** | `src/lib/infrastructure/jobs/handlers.ts`, `src/lib/i18n/multilingual/translation-queue.ts` |

#### P-034 — Translation audit uses 6+ sequential count queries

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `auditTranslationCoverage` fires separate `count` queries per job status on `worker_jobs`. |
| **Estimated impact** | ~6 Supabase round-trips per backfill run × 8 runs/day = 48 audit query groups/day. |
| **Recommended fix** | Single grouped count RPC or raw SQL. |
| **Files involved** | `src/lib/i18n/multilingual/translation-queue.ts` |

#### P-035 — `translate.ts` parallel cache path

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `translateArticleBundle` uses own `fetch` + manual cache logic, not `requestChatCompletion`. |
| **Estimated impact** | Drift from central retry/cache/usage tracking; misses fixes applied to `chat.ts`. |
| **Recommended fix** | Unify through `requestChatCompletion`. |
| **Files involved** | `src/lib/i18n/multilingual/translate.ts`, `src/lib/ai/providers/chat.ts` |

#### P-036 — DLQ requeue without consumption marker

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `requeueDeadTranslationJobs` reads `worker_dead_letters` every backfill; does not delete/mark rows after requeue. |
| **Estimated impact** | Same poison messages re-attempted every 6h; wasted worker time. DLQ has no retention in `cleanup_old_data`. |
| **Recommended fix** | Mark DLQ rows processed; add retention to cleanup RPC. |
| **Files involved** | `src/lib/i18n/multilingual/translation-queue.ts`, `supabase/migrations/046_production_retention_security.sql` |

---

### 7. Editorial Queue & Publishing

#### P-037 — Desk publish does not revalidate homepage caches

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `publishGeneratedArticle` emits `articles.published` event but does not call `revalidateNewsroomCaches`. Event downstream jobs (embed, SEO) do not bust ISR/Redis. |
| **Estimated impact** | Manual publishes invisible on homepage for up to ISR TTL (60s) + stale Redis tenant keys (see P-041) until next ingest or poll. |
| **Recommended fix** | Call `revalidateNewsroomCaches({ publishedStories: 1 })` in `publishGeneratedArticle`. |
| **Files involved** | `src/lib/editorial/publication.ts`, `src/lib/editorial-workflow/store.ts`, `src/lib/infrastructure/cache/isr.ts` |

#### P-038 — Auto-publish vs desk-publish translation asymmetry

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | Auto-publish: inline translate. Desk publish: event-bus queue enqueue only. |
| **Estimated impact** | Inconsistent latency and cost profile; harder to reason about translation state. |
| **Recommended fix** | Unified queue path for both. |
| **Files involved** | `src/lib/news/ai/generate-article.ts`, `src/lib/infrastructure/events/event-bus.ts` |

#### P-039 — `ingest.completed` fans out 4 job types per ingest

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | Event bus maps `ingest.completed` → `editorial_generate`, `event_cluster`, `intelligence_snapshot`, `analytics_aggregate`. |
| **Estimated impact** | 4 jobs enqueued per ingest with new signals; job_processor + orchestrate workers compete. |
| **Recommended fix** | Consolidate into orchestrate-only fan-out or stagger priorities. |
| **Files involved** | `src/lib/infrastructure/events/event-bus.ts`, `src/lib/infrastructure/jobs/queue.ts` |

---

### 8. Homepage Ranking & Publication

#### P-040 — Homepage pool fetched and ranked multiple times per ISR miss

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `getGeneratedHomepageFeed`: (1) `resolveLiveArticlePool(120)` always runs first (includes `rankPoolByFeedQuality`). (2) Redis miss → `unstable_cache` callback fetches pool **again**. (3) `buildFeedFromPool` → `rankArticlesForHomepage`. Early Redis return still paid step 1 cost. |
| **Estimated impact** | 2× pool DB queries + 2× quality rank + 1× AI rank per homepage ISR miss. At 60s revalidate × traffic, dominant serverless cost on homepage. |
| **Recommended fix** | Check Redis/ISR before pool fetch; pass pool into cache callback; single rank pass. |
| **Files involved** | `src/lib/homepage/get-feed.ts`, `src/lib/news/live-feed/resolve-pool.ts`, `src/lib/homepage/generated-feed.ts`, `src/lib/news/ai/ranking.ts` |

#### P-041 — Redis homepage key mismatch on revalidation

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Root cause** | Feed written to `nr:homepage:feed:v1:{tenant}:{lang}` (`get-feed.ts`). `revalidateNewsroomCaches` deletes only `nr:homepage:feed:v1` without tenant/lang suffix. |
| **Estimated impact** | Stale Redis feed served until TTL (default 60s) after publish/ingest revalidation. Users may see old homepage between ISR and Redis expiry. |
| **Recommended fix** | Delete by pattern `nr:homepage:feed:v1:*` or include tenant/lang in revalidate call. |
| **Files involved** | `src/lib/infrastructure/cache/isr.ts`, `src/lib/homepage/get-feed.ts`, `src/lib/infrastructure/cache/index.ts` |

#### P-042 — Segment micro-caches never invalidated

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `writeFeedSegmentCaches` writes `news:homepage`, `news:breaking`, `news:regional` (TTL 45–75s). `revalidateNewsroomCaches` does not delete these keys. |
| **Estimated impact** | Partial homepage segments stale after publish. |
| **Recommended fix** | Delete segment keys in `revalidateNewsroomCaches` or derive segments from main feed only. |
| **Files involved** | `src/lib/news/live-feed/segment-cache.ts`, `src/lib/infrastructure/cache/isr.ts` |

#### P-043 — Live polling rebuilds full feed without shared cache

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `GET /api/homepage/live` → `buildLiveHomepageSnapshot` runs full `resolveLiveArticlePool` + `buildGeneratedHomepageFeed` + ranking. No `unstable_cache`, no Redis. Clients poll every 60–120s (`useNewsroomPolling`). |
| **Estimated impact** | Per connected user: ~30–60 full pipeline rebuilds/hour. 100 concurrent users ≈ 3,000–6,000 serverless invocations/hour on live endpoint alone. |
| **Recommended fix** | Edge-cache snapshot 30–60s; or diff-only updates; reduce poll interval when realtime active. |
| **Files involved** | `src/lib/realtime/build-snapshot.ts`, `src/app/api/homepage/live/route.ts`, `src/hooks/useNewsroomPolling.ts`, `src/hooks/useRealtimeTrigger.ts` |

#### P-044 — Realtime + interval polling stack

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `LiveNewsroomProvider` mounts both `useNewsroomPolling` (90s) and `useRealtimeTrigger` (Supabase `generated_articles` changes → debounced poll). |
| **Estimated impact** | Burst polling during active publishing (every few seconds). |
| **Recommended fix** | Disable interval poll when realtime connected; or single debounced fetch. |
| **Files involved** | `src/providers/LiveNewsroomProvider.tsx`, `src/hooks/useNewsroomPolling.ts`, `src/hooks/useRealtimeTrigger.ts` |

#### P-045 — Triple ranking systems (legacy + quality + AI)

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `home-ranking.ts` (legacy `news_articles`), `quality-score.ts` (pool), `ranking.ts` (homepage AI rank) — production path applies quality then AI rank; legacy stack unused on main `page.tsx`. |
| **Estimated impact** | CPU on double-rank; legacy code maintenance burden. |
| **Recommended fix** | Deprecate `news-db.ts` homepage path; document single ranking pipeline. |
| **Files involved** | `src/lib/news/home-ranking.ts`, `src/lib/news-db.ts`, `src/lib/news/live-feed/quality-score.ts`, `src/lib/news/ai/ranking.ts` |

#### P-046 — District/category pages re-fetch and rank independently

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `district/[slug]/page.tsx` and category pages call pool resolution without shared cache with homepage. |
| **Estimated impact** | Extra DB queries on section page views. |
| **Recommended fix** | Shared `unstable_cache` pool layer keyed by tenant. |
| **Files involved** | `src/app/district/[slug]/page.tsx`, category page routes |

---

### 9. Search Indexing

#### P-047 — Search index never tag-invalidated on publish

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `revalidateNewsroomCaches` invalidates `live-news`, `homepage-feed`, `generated-stories` but not `news-search-index` tag used in `search.ts`. |
| **Estimated impact** | New articles missing from search for up to 120s (`unstable_cache` revalidate). |
| **Recommended fix** | Add `revalidateTag("news-search-index")` on publish/ingest. |
| **Files involved** | `src/lib/infrastructure/cache/isr.ts`, `src/lib/search/search.ts`, `src/lib/search/indexer.ts` |

#### P-048 — Search indexer re-fetches and re-ranks pool independently

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `loadSearchIndexUncached` calls `fetchGeneratedArticlePool(200)` + `rankArticlesForHomepage` separately from homepage path. |
| **Estimated impact** | Duplicate 200-row query + rank on search page ISR miss. |
| **Recommended fix** | Share cached pool artifact with homepage. |
| **Files involved** | `src/lib/search/search.ts`, `src/lib/search/indexer.ts`, `src/lib/newsroom/generated/read.ts` |

---

### 10. Cleanup, Retries & Dead Letters

#### P-049 — Cleanup cron exact duplicate (QStash + Vercel)

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | Both schedulers fire `30 3 * * *` → `/api/cron/cleanup`. No overlap lock on cleanup route. |
| **Estimated impact** | 2× `cleanup_old_data` RPC daily; potential race on concurrent deletes. |
| **Recommended fix** | Remove from `vercel.json` OR stagger backup; add `runWorkerEndpoint` lock on cleanup. |
| **Files involved** | `vercel.json`, `scripts/setup-qstash-schedules.mjs`, `src/app/api/cron/cleanup/route.ts` |

#### P-050 — Queue cleanup audit N+1 count queries

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `countByStatus` in `queue-cleanup.ts` runs 6–8 parallel `count` queries per queue table; `auditAllQueues` calls for AI, image, worker queues. |
| **Estimated impact** | ~18+ queries when `pendingTotal ≥ 200` on cleanup day. |
| **Recommended fix** | Grouped count SQL or single audit RPC. |
| **Files involved** | `src/lib/ops/queue-cleanup.ts`, `src/lib/ops/data-retention.ts` |

#### P-051 — `job_processor` + specialized workers drain overlapping job types

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | Orchestrate runs `job_processor` (all types) then `intelligence_embed` (embed only) then `intelligence_snapshot` (includes `translate_article`). Translation also drained by dedicated cron. |
| **Estimated impact** | Redundant claim attempts; mostly no-op if queue empty. |
| **Recommended fix** | Narrow `job_processor` types or remove duplicate drains from snapshot worker. |
| **Files involved** | `src/lib/infrastructure/cron/orchestrator.ts`, `src/lib/infrastructure/workers/intelligence-workers.ts`, `src/lib/infrastructure/jobs/handlers.ts` |

#### P-052 — Provider retry × queue retry stacking (AI enrich)

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Root cause** | `withTransientAiRetry` (2 attempts) inside `enrichArticle` × `markAiQueueOutcome` (4 attempts) without backoff enforcement (P-014). |
| **Estimated impact** | Up to 8 LLM calls per stubborn article. |
| **Recommended fix** | Fix backoff (P-014); reduce queue max attempts for enrich vs editorial. |
| **Files involved** | `src/lib/news/ai/process.ts`, `src/lib/news/ai/ai-queue-retry.ts`, `src/lib/ai/providers/retry.ts` |

#### P-053 — Event bus retry with 5s linear backoff

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | Failed delivery reschedules `attempts * 5000ms`, max 3 attempts. |
| **Estimated impact** | Acceptable; 7-day retention in cleanup. |
| **Recommended fix** | Monitor failed event rate. |
| **Files involved** | `src/lib/infrastructure/events/event-bus.ts` |

---

### 11. Cron & QStash Orchestration

#### P-054 — No Vercel backup for orchestrate

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `/api/cron/orchestrate` QStash-only; not in `vercel.json`. |
| **Estimated impact** | If QStash fails, AI enrich + job_processor + images stall until manual GHA workflow. |
| **Recommended fix** | Add daily Vercel backup cron or alerting on stale `ai_enrich` checkpoint. |
| **Files involved** | `vercel.json`, `scripts/setup-qstash-schedules.mjs`, `.github/workflows/workers.yml` |

#### P-055 — Orchestrate revalidate only when editorial_generate in results

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `orchestrator.ts` checks `results.find(r => r.worker === "editorial_generate")` but `INTELLIGENCE_PIPELINE` does not include `editorial_generate` worker. Revalidate on orchestrate path rarely fires from orchestrator itself. |
| **Estimated impact** | Misleading code path; revalidation happens via editorial cron instead. |
| **Recommended fix** | Revalidate when `ai_enrich` processed or remove dead branch. |
| **Files involved** | `src/lib/infrastructure/cron/orchestrator.ts` |

#### P-056 — `workers/health` not in cron monitor registry

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `REGISTERED_CRON_JOBS` omits `workers/health` though QStash runs it hourly. |
| **Estimated impact** | Stale health cron not alerted. |
| **Recommended fix** | Add to registry or document as observability-only. |
| **Files involved** | `src/lib/infrastructure/cron/registered-jobs.ts`, `src/app/api/cron/workers/health/route.ts` |

#### P-057 — QStash retries: 3 on all schedules

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `retries: 3` in setup script for all endpoints including 300s translation-backfill. |
| **Estimated impact** | 4× invocation on persistent 5xx; overlap lock usually prevents duplicate work. |
| **Recommended fix** | Lower retries for idempotent read endpoints. |
| **Files involved** | `scripts/setup-qstash-schedules.mjs` |

---

### 12. Cache, Redis & Invalidation

#### P-058 — Legacy `homepage.ts` cache module unused

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `getOrBuildHomepageFeed` in `cache/homepage.ts` not used by `page.tsx`; main path is `get-feed.ts`. |
| **Estimated impact** | Two cache designs; confusion only. |
| **Recommended fix** | Remove legacy module or consolidate. |
| **Files involved** | `src/lib/infrastructure/cache/homepage.ts`, `src/lib/homepage/get-feed.ts` |

#### P-059 — Duplicate rate-limit implementations

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Root cause** | `infrastructure/cache/rate-limit.ts` and `security/rate-limit.ts` both use Redis `rl:` namespace. |
| **Estimated impact** | Inconsistent limits depending on call site. |
| **Recommended fix** | Single rate-limit module. |
| **Files involved** | `src/lib/infrastructure/cache/rate-limit.ts`, `src/lib/security/rate-limit.ts` |

#### P-060 — Redis optional; overlap locks degrade without it

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | `run-guard.ts` falls back to in-memory lock per serverless instance. |
| **Estimated impact** | Multi-instance Vercel: overlap lock ineffective → duplicate ingest/editorial runs possible. |
| **Recommended fix** | Require Redis in production for worker locks. |
| **Files involved** | `src/lib/infrastructure/workers/run-guard.ts`, `src/lib/infrastructure/cache/redis.ts` |

#### P-061 — `process-ai` revalidates on enrichment not publish

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Root cause** | Revalidates when `result.processed > 0` regardless of publish. |
| **Estimated impact** | Homepage rebuilds when only wire metadata enriched. |
| **Recommended fix** | Remove revalidate or gate on publish events. |
| **Files involved** | `src/app/api/process-ai/route.ts` |

---

### 13. OpenAI Cost Reduction Opportunities (Summary)

| Opportunity | Est. savings | Finding |
|-------------|--------------|---------|
| Restore prompt cache | 20–40% chat cost | P-021 |
| Fix AI queue claim race | 5–10% enrich cost | P-013 |
| Single editorial trigger | 10–20% editorial eval cost | P-019 |
| Queue-only translation | 15–25% translation cost | P-023, P-031 |
| Route repair through cache | 5–10% editorial cost | P-020 |
| Cap image repair attempts | 10–30% image cost | P-026 |
| Unify embedding paths | 50% embedding cost when both on | P-010 |
| Pre-filter before editorial LLM | 5–15% editorial cost | P-024 |

---

### 14. Serverless & Supabase Reduction Opportunities

| Opportunity | Finding |
|-------------|---------|
| Defer per-batch revalidation | P-004 |
| Single pool fetch on homepage | P-040 |
| Cache live snapshot 30–60s | P-043 |
| Remove duplicate cleanup cron | P-049 |
| Single translation scheduler | P-032 |
| Grouped queue count queries | P-034, P-050 |
| Narrow `select("*")` in pipeline | Widespread in `process.ts`, `generate-article.ts` |
| Disable wire fallback sync fetch | P-003 |

---

## Priority Summary

### Critical Issues

1. **P-013** — Non-atomic AI queue claim → duplicate enrichment OpenAI calls  
2. **P-021** — Prompt cache table missing → 100% cache miss on all cached paths  
3. **P-041** — Redis homepage key mismatch → stale feed after revalidation  

### High Priority

4. **P-004** — Per-provider-batch revalidation (5–10× per ingest)  
5. **P-010** — Dual embedding pipelines when both enabled  
6. **P-014** — AI queue backoff ignored → hot retry loops  
7. **P-019** — Triple editorial_generate trigger  
8. **P-020** — Editorial repair bypasses prompt cache  
9. **P-023** — Inline 5-language translation on auto-publish  
10. **P-026** — Nested image repair × queue retry (up to ~12 DALL-E calls)  
11. **P-031** — Five overlapping translation triggers  
12. **P-037** — Desk publish does not revalidate homepage  
13. **P-040** — Homepage pool fetched/ranked 2–3× per ISR miss  
14. **P-043** — Live polling full rebuild per client  
15. **P-047** — Search index never invalidated on publish  
16. **P-049** — Cleanup cron exact duplicate  
17. **P-052** — Provider × queue retry stacking  

### Medium Priority

18. **P-001, P-002, P-003** — Ingest dedup and provider overlap  
19. **P-008** — Dual snapshot refresh  
20. **P-009, P-011** — Clustering triggers and full-table scan  
21. **P-015, P-016, P-028, P-029** — AI/image queue inefficiencies  
22. **P-022, P-024, P-027, P-032–P-036, P-038, P-039** — Translation and publish asymmetry  
23. **P-042, P-044, P-045, P-048** — Cache segments, polling stack, ranking duplication  
24. **P-050, P-051, P-054, P-060, P-061** — Cron overlap and infrastructure gaps  

### Low Priority

25. **P-005–P-007, P-012, P-017, P-018, P-025, P-030, P-046** — Edge cases and scale limits  
26. **P-053, P-055–P-059** — Documentation drift, legacy modules  
27. **P-006** — Dead ingestion code paths  

---

## Pipeline Stage Health Matrix

| Stage | Status | Primary risk |
|-------|--------|--------------|
| RSS/GNews/NewsData ingest | ✅ Functional | Provider overlap, per-batch revalidate |
| Signal persistence | ✅ Functional | Cross-provider dedup gap |
| Clustering | ⚠️ Partial | Unscheduled recovery cron |
| AI enrichment queue | ❌ Race + backoff | Duplicate OpenAI calls |
| Editorial generation | ⚠️ Expensive | Triple trigger, repair bypass |
| Image generation | ⚠️ Backlog-prone | Deadline skip, nested retries |
| Translation | ❌ Redundant paths | 5 triggers, dual schedulers |
| Publishing | ⚠️ Partial | Desk publish cache gap |
| Homepage serve | ⚠️ Expensive | Multi-fetch, Redis mismatch, live poll |
| Search | ⚠️ Stale | No tag invalidation |
| Cleanup | ⚠️ Duplicate cron | Double daily execution |
| Cron/QStash | ✅ Mostly OK | Translation + cleanup overlap |

---

## Phase 3 Complete

No code modifications, commits, or migrations were made.  
**Stop here.** Further phases not started per instructions.
