# AI_NEWSROOM_FINAL_AUDIT — Jandarpan News (Repo Audit)

Date: 2026-07-07  
Scope: ingestion → AI → translation → images → publishing → homepage/district/SEO → cron/QStash → Redis → Supabase → queues → capacity → usage + costs  
Method: static repo audit (code + docs). No production data queried.

---

## Executive summary

### What the system is
- **Next.js 16 App Router** newsroom with a **durable Postgres queue** model (Supabase) for async work (`worker_jobs`, `event_bus_messages`, `news_ai_queue`, `editorial_image_queue`) plus optional **Upstash Redis** for caching.
- **Two feed layers**:
  - Primary public pool: `generated_articles` (public only when `published_at` is set and status is public).
  - Wire fallback pool: external provider articles mapped into generated-like rows when DB is sparse.

### Output / capacity model (current repo state)
- Central capacity: `EDITORIAL_CAPACITY.dailyLimit = 40` with six edition publish windows in IST:
  - 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
- Edition scheduler publishes only at those windows; outside those times stories remain “ready” (scheduled).

### Top bottlenecks (most likely)
1. **Editorial images**: high latency and expensive per unit; queue can dominate time budgets and cost.
2. **Translation backlog**: can fan out per published story; risk of queue amplification if auto-translate is enabled broadly.
3. **Job queue drain rate**: `WORKER_JOB_BATCH` defaults to 8; under sustained load, this is the main throttle.
4. **Supabase query volume**: dashboard + health endpoints query multiple tables; without cache (Redis) this can become a hotspot.
5. **Scheduler drift / doc mismatch**: QStash docs describe schedules that have since been retired/changed in code.

---

## System architecture (as implemented)

### Core data layers (Supabase)
- `news_signals` (raw/private): ingestion output; never directly rendered.
- `news_events` (private): clustered/merged story events from signals.
- `generated_articles` (public editorial): AI-produced editorials; only public when published gate fields are set.
- `news_articles` (legacy bridge): “wire-style” public rows (compat layer).

### Async orchestration primitives
- **Event bus**: `event_bus_messages` with topic→job mapping (`src/lib/infrastructure/events/event-bus.ts`)
  - `ingest.completed` triggers: editorial generation, clustering, snapshot, analytics.
  - `articles.published` triggers downstream jobs (embeddings/SEO/snapshot) when emitted.
- **Job queue**: `worker_jobs` + `worker_dead_letters` (`src/lib/infrastructure/jobs/*`)
  - Deduplication: `(job_type, dedupe_key)` among `pending/claimed`.
  - Retries: exponential backoff; dead-letter on max attempts.

---

## Ingestion audit

### Entry points
- Primary: `POST /api/fetch-news` (QStash schedule; bearer CRON_SECRET + QStash signature verification)
- Backup: Vercel cron in `vercel.json` (daily) for `fetch-news`.

### What ingestion does (`src/lib/news/pipeline/scalable-ingest.ts`)
- Parallel API providers + RSS batched ingest.
- Validates/sanitizes content; enriches with images (bounded page fetches).
- Upserts into legacy `news_articles` and writes signals into `news_signals`.
- Enqueues AI enrichment work in `news_ai_queue` (counted via `queuedForAI`).
- Writes `ingestion_logs` row with detailed metadata including validation stats and image enrichment analytics.
- Publishes events:
  - `publishIngestCompleted` and `publishSignalsCreated` if `signalsInserted > 0` and workers enabled.

### Backpressure / safety
- Ingest deadline budget: `INGEST_BUDGET_MS` default 52s (serverless-safe).
- **Queue Health Manager** can pause ingestion when queues are above limits (repo includes that mechanism).

**Risk**: provider image page fetches can be the time sink; keep `maxImagePageFetches` bounded and ensure timeouts are enforced.

---

## AI enrichment audit (legacy articles)

### Queue
- `news_ai_queue` claimed via RPC `claim_ai_queue_batch` with stale reclaim; fallback exists but warns about double-claim risks.

### Processing (`src/lib/news/ai/process.ts`)
- Deadline-aware micro-batching (`aiQueueMicroBatch` default 10; batch limit default param 10).
- Supports local deterministic fallback when configured.
- Records failures and outcomes (`ai-queue-retry`, `failure-record`).

**Bottleneck signals**:
- Large `news_ai_queue` pending with slow drain suggests token/cost pressure or provider throttling.
- `AI_QUEUE_STALE_PROCESSING_MS` must be tuned to avoid reclaim thrash.

---

## Editorial generation audit (AI editorials)

### Quality gates
File: `src/lib/news/ai/editorial-guards.ts`
- Confidence thresholds, source overlap limits, hallucination flags, strict mode, hard reject reasons.
- Clickbait flags exist and can be penalized in ranking.

### Generation pipeline
File: `src/lib/news/ai/generate-article.ts`
- Builds fact pack from signals; calls LLM; parses JSON; runs quality checks; optional repair.
- Persists into `generated_articles` with rich `editorial_metadata` (confidence, breakdown, sources, etc.).

### Breaking override
- Immediate publish when urgency/confidence/trusted sources thresholds are met (as implemented in repo).

### Edition scheduling (publishing decoupled)
- Generated stories are typically persisted as `workflow_status="scheduled"` (ready) and published only by the edition scheduler window.

**Bottleneck signals**:
- If `generated_articles` grows but published pool is thin: edition scheduler cadence/limits, or too many Tier 4 rejects, or strict quality floor.

---

## Translation audit

### Mechanism
File: `src/lib/i18n/multilingual/translation-queue.ts`
- On publish, `publishArticlePublished()` may enqueue translations (`translate_article`) + schedule batch scans.
- Translation audit tool exists to measure coverage and backlog.

### Risks
- Translation can **fan out** (multiple target languages).
- If `NEWSROOM_AUTO_TRANSLATE=true` and `NEWSROOM_TRANSLATE_LANGS` is wide, costs and queue sizes can jump quickly.

**Bottleneck signals**:
- Many pending `translate_article` jobs with low completion = OpenAI throttling or job drain cadence too low.
- Incomplete bundles indicate partial writes or failures.

---

## Images audit

### Queue + claims
Files:
- `src/lib/news/ai/editorial-image-queue.ts`
- `src/lib/news/ai/generate-editorial-image.ts`

Properties:
- Durable `editorial_image_queue` with `pending/processing/completed/failed`.
- Claim RPC `claim_editorial_image_batch` with fallback that orders by priority and oldest created.
- Strong moderation + quality gating + retries + storage/CDN pipeline.

### Cost + latency profile
Pricing references in repo (`src/lib/observability/openai-cost/pricing.ts`) imply images can be **$0.08** per 1792×1024 DALL·E 3 style unit cost.

**Bottleneck signals**:
- `editorial_image_queue` pending rising while openAI success is low or average latency is high.
- This is usually the single biggest unit-cost driver.

---

## Publishing audit

### Public visibility gate
File: `src/lib/newsroom/publish-state.ts`
- Public pool requires:
  - `published_at` set
  - `editorial_status` is in `approved/published/live` (and not rejected/pending/archived)

### Edition publish
- Publish happens at edition windows (IST schedule).
- “Ready queue” = rows with `workflow_status="scheduled"` and `published_at IS NULL`.

**Bottleneck signals**:
- Ready queue grows faster than publish capacity → edition publish limit too low, or too much generation, or publish cadence insufficient.

---

## Homepage + district pages audit

### Homepage pool resolver
File: `src/lib/news/live-feed/resolve-pool.ts`
- Uses DB pool first; wire providers only if DB critically sparse.
- Always ranks the resolved pool (quality-score layer).
- Saves stale snapshot for resilience.

### Homepage feed assembly
File: `src/lib/homepage/generated-feed.ts`
- Uses `rankArticlesForHomepage()` to compute priority + reasons and fill slots.
- No direct dependence on ingestion behavior; strictly consumes published pool.

### District pages
File: `src/app/district/[slug]/page.tsx`
- Fetches generated pool and re-ranks with district personalization boost.
- SEO metadata built via `buildPageMetadata`, JSON-LD emitted.

---

## SEO audit

### Published-time dependence
- Sitemaps and metadata use `published_at` as last-modified/published time (e.g. `src/lib/seo/sitemap-data.ts`).
- This aligns with the edition scheduler: stories are “draft/scheduled” until published.

### Risk
- If edition scheduler is misconfigured, SEO surface can become stale because published pool doesn’t update.

---

## Cron workers + QStash audit

### QStash (primary)
Doc: `docs/QSTASH_SCHEDULER_SETUP.md`
- Schedules described at `:07/:37`, `:15/:45`, etc.
- Notes signature verification and CRON_SECRET.

### Vercel cron (backup)
Config: `vercel.json`
- Daily backups only:
  - `/api/fetch-news`
  - `/api/cron/worker/editorial_generate`
  - `/api/cron/translation-backfill`
  - `/api/cron/cleanup`

### Risk: drift between docs and repo code
- QStash docs still reference schedules and behaviors that may have been retired in code (example: editorial-generate direct schedule retirement is mentioned in `scripts/setup-qstash-schedules.mjs` comments).
- Recommendation: treat `scripts/setup-qstash-schedules.mjs` as the source of truth and ensure docs match it.

---

## Redis audit (Upstash REST)

File: `src/lib/infrastructure/cache/redis.ts`
- Optional; cache-only (not a queue).
- REST calls with 2.5s timeout.

**Bottleneck risks**
- If Redis is enabled but slow/unreliable, cache calls can become tail-latency contributors (especially for dashboards).
- Ensure cache reads are best-effort (they are) and fallbacks exist (they do).

---

## Supabase audit

### Env safety
File: `src/lib/supabase/env.ts`
- Trims whitespace/quotes; validates hostname; logs once.

### Operational dependency
- Almost every pipeline stage assumes Supabase availability; resolver falls back to wire/stale/static for homepage but generation/workers need DB.

**Bottleneck risks**
- RLS / permissions mismatch can cause silent “empty pool” behaviors (homepage empties but no hard crash).
- High-frequency dashboard reads without caching can pressure DB.

---

## Queue sizes + health

### Observability
File: `src/lib/observability/queue-analytics.ts`
- Tracks AI pending/dead, editorial image queue pending/processing, drain rates, ETAs.

### Health expectations (from docs)
Doc: `docs/PRODUCTION_OPERATIONS.md`
- Target backlogs: AI pending < 500, images < 200 (baseline ops checklist).

### Backpressure model
- Queue Health Manager (repo includes a health snapshot + ingestion pause + oldest-first job drain mode).

**Main bottleneck pattern**
- If images/translation build up, ingestion must pause or downstream will drown; oldest-first drain helps recovery.

---

## Daily capacity + expected daily output

### Editorial capacity model
- `EDITORIAL_CAPACITY.dailyLimit = 40` and editions split across six IST windows.

### Expected daily output (editorials)
- **Target**: 40 published editorials/day (ex breaking override, which can publish immediately).
- **Upper bound**: higher if breaking overrides publish outside windows (breakingUnlimited=true).

### Ingestion output (signals/articles)
- Provider-dependent; can exceed editorial capacity. The system is designed to absorb this via event clustering + generation limits + scheduling.

---

## OpenAI / image / translation usage (instrumentation)

### OpenAI usage
File: `src/lib/observability/openai-cost/dashboard.ts`
- Reads from `openai_usage_events` and produces breakdown by worker/model/article.

### Pricing references (estimation)
File: `src/lib/observability/openai-cost/pricing.ts`
- `gpt-4o-mini`: $0.15 / 1M input, $0.6 / 1M output (cached input discounted).
- Images: DALL·E 3 1792×1024 ≈ $0.08 per image.
- Embeddings: `text-embedding-3-small` $0.02 / 1M tokens.

### Expected monthly cost (static estimate bands)
Without production token counts, the most reliable banded estimate is:
- **Images**: \(40/day × 30 × \$0.08\) ≈ **$96/month** if every published story gets an AI image.
- **Translation**: depends on targets; if 2 translations per story at ~$0.002 each → \(40×30×2×0.002\) ≈ **$4.80/month** (often higher in practice).
- **Editorial generation**: highly token dependent. Even at $0.002–$0.02 per story, this ranges **$2.40–$24/month** at 1200 stories/month.

**Dominant driver is images** unless you’re using expensive chat models or generating shorts/voice at scale.

---

## Expected concurrent users (capacity planning)

Static repo signals:
- Homepage feed TTL ~60s; optional Redis cache; pool resolver has stale snapshot fallback.
- Next.js on Vercel scales horizontally; most public traffic hits cached pages/edge where applicable.

Practical expectation (order-of-magnitude):
- **100–500 concurrent users** should be viable if:
  - Redis is enabled (optional but recommended)
  - Supabase rate limits are respected and queries are bounded (`limit` everywhere)
  - Heavy work stays off request path (it does)

Biggest risk for concurrency is not the homepage rendering but **admin dashboards** if polled aggressively without cache.

---

## Bottlenecks and mitigation plan

### 1) Editorial images queue dominates cost + time
- **Symptoms**: high `editorial_image_queue.pending`, rising failures/latency, OpenAI success rate drops.
- **Mitigations**:
  - Strict tiering: only Tier 1–2 generate images.
  - Lower image resolution / provider switch if possible.
  - Increase `editorial_images` worker cadence if budget allows.

### 2) Translation fanout under auto-translate
- **Symptoms**: translate jobs explode; queue doesn’t drain.
- **Mitigations**:
  - Tier-gate translations to Tier 1 only.
  - Keep translation targets limited (reader pairs only).

### 3) Job queue drain throughput (worker_jobs)
- **Symptoms**: `worker_jobs.pending` grows; “oldest” items stay stuck.
- **Mitigations**:
  - Increase `WORKER_JOB_BATCH` (careful with serverless max duration).
  - Run job processor more frequently (QStash cadence).
  - Keep oldest-first drain mode under pressure.

### 4) Scheduler mismatch / operational drift
- **Symptoms**: expected jobs not running; stale cron monitors.
- **Mitigations**:
  - Treat `scripts/setup-qstash-schedules.mjs` as canonical schedule spec.
  - Update `docs/QSTASH_SCHEDULER_SETUP.md` to match live schedule IDs/cadence.

### 5) Supabase/Redis optionality
- **Symptoms**: missing env → empty pools; cache disabled → higher DB cost.
- **Mitigations**:
  - Enforce env checks in health panel.
  - Enable Upstash Redis for dashboard snapshots and rate-limits.

---

## Launch readiness checklist (repo-derived)

- QStash:
  - `CRON_SECRET`, `QSTASH_*_SIGNING_KEY` configured
  - schedules reflect repo script
- Supabase:
  - anon URL/key + service role present; RLS matches public read paths
  - migrations applied for queues/observability tables
- OpenAI:
  - API key present; model defaults acceptable
  - image generation enabled only when desired (cost control)
- Capacity:
  - edition publish windows align with newsroom cadence
  - dailyLimit set to expected output
- Queues:
  - AI pending < 500, images < 200 (baseline)
  - translation backlog monitored
- Observability:
  - `/api/health` grade ≥ B and no critical failures

---

## Appendix: key “sources of truth” in repo

- Capacity: `src/lib/newsroom/editorial-capacity.ts`
- Publishing gate: `src/lib/newsroom/publish-state.ts`
- Homepage ranking: `src/lib/news/ai/ranking.ts`
- Pool resolver: `src/lib/news/live-feed/resolve-pool.ts`
- QStash schedules: `scripts/setup-qstash-schedules.mjs`
- Vercel backup crons: `vercel.json`
- Queue analytics: `src/lib/observability/queue-analytics.ts`
- OpenAI usage: `src/lib/observability/openai-cost/dashboard.ts`
- Redis: `src/lib/infrastructure/cache/redis.ts`
- Supabase env validation: `src/lib/supabase/env.ts`

