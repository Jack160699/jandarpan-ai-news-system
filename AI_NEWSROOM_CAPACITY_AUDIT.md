# AI Newsroom Production Capacity Audit — Jandarpan News

Status: **Verification / capacity audit only (no code changes).**  
Audit basis: **code-level throughput limits + scheduler cadence + queue configuration** (not live production metrics).

---

## Executive summary (answers)

### 1) How many articles can be generated every hour?

**Theoretical max (code + schedule bound): ~12 generated articles/hour**.

- Primary scheduler (Upstash QStash) runs **orchestrate at `:15` and `:45` UTC** ⇒ **2 runs/hour**.
- `editorial_generate` worker generates up to `INFRA_CONFIG.editorialBatchLimit` articles per run (default **6**).
- Therefore: \(2 \text{ runs/hr} \times 6 \text{ articles/run} = 12 \text{ articles/hr}\).

Sources:
- `docs/QSTASH_SCHEDULER_SETUP.md` (schedule cadence)
- `scripts/setup-qstash-schedules.mjs` (`15,45 * * * *` orchestrate)
- `src/lib/infrastructure/config.ts` (`editorialBatchLimit: 6`)
- `src/lib/infrastructure/workers/registry.ts` (editorial worker uses `editorialBatchLimit`)
- `src/lib/news/ai/generate-article.ts` (batch generation limit)

### 2) How many articles can be generated every day?

**Theoretical max (schedule bound): ~288 generated articles/day**.

- Orchestrate runs **48×/day** (2×/hour × 24h)
- Each run can publish up to **6**
- \(48 \times 6 = 288\)

The repository’s own production doc also states **“Theoretical articles/day up to 288”** and a typical sustained rate around **~10–12 articles/hour**.

Source: `docs/QSTASH_SCHEDULER_SETUP.md` (Expected throughput section).

### 3) What is the current bottleneck?

**Primary bottleneck: `editorial_generate` throughput ceiling** (batch limit + scheduler cadence + OpenAI latency/timeouts).

Concretely:
- The system only *attempts* up to **6 new events per orchestrate run**, even if backlog is larger.
- Each article generation includes multiple heavyweight steps (fact pack, LLM generation, quality checks, persistence, optional repair, shorts bundle build, image queue enqueue), with an overall 60s function max for orchestrate workers.

Secondary bottlenecks (often downstream of generation volume):
- **Editorial images**: `editorial_images` worker is explicitly treated as “heavy” and can be skipped under deadline pressure; queue may grow.
- **Translation**: per-article translations are job-queued; throughput depends on job processor batch size and orchestrate cadence.
- **Embeddings / clustering**: optional (embeddings gated by `NEWSROOM_USE_EMBEDDINGS`), but can be rate-limited by OpenAI embeddings endpoint and job batch size.

### 4) What is the maximum sustainable throughput?

From code-level constraints (no assumptions about OpenAI org limits), the **maximum sustainable** “generated & published” throughput is best expressed as a **safe envelope**:

- **Ceiling (scheduler + batch)**: **12 published generated stories/hour**; **288/day**
- **Sustainable (quality + downstream workloads)**: **6–10/hour**; **120–240/day**

Why the sustainable recommendation is lower than the ceiling:
- Quality acceptance is intentionally non-100% (editorial guards reject candidates).
- Images/translation/backfill/embeddings add compounding queue pressure.
- Orchestrate has **deadline-aware skipping** (especially for images), which increases lag when load is high.

### 5) Recommended throughput for a high-quality regional news platform

For a regional digital newspaper (Chhattisgarh-first, Hindi-first), a high-quality sustainable mix is:

- **Recommended publish rate**: **80–140 articles/day** (average **~4–6/hour**, burstable higher during breaking events).
- **Hard max (quality-first)**: **200/day** (beyond this, you will likely see more duplication, weaker local relevance, and higher AI + image + translation operating cost).

Final recommendation (your multiple-choice): **“100 articles/day”** as the default target, with **burst mode** up to **150–200/day** during major events.

Justification is detailed in the “Quality & business strategy” and “Bottlenecks” sections below.

---

## Pipeline trace (end-to-end)

This section traces **every stage** in the production AI newsroom as implemented in the repo.

### A) Schedulers / cron cadence (production)

Primary: **Upstash QStash** schedules.

Configured schedules (UTC):
- **Ingestion**: `POST /api/fetch-news` at `7,37 * * * *` (2×/hour)
- **Orchestrate intelligence pipeline**: `POST /api/cron/orchestrate` at `15,45 * * * *` (2×/hour)
- **Workers health**: hourly
- **Translation backfill enqueue**: every 6 hours (`20 */6 * * *`)
- **Cleanup**: daily at `03:30 UTC`

Sources:
- `scripts/setup-qstash-schedules.mjs`
- `docs/QSTASH_SCHEDULER_SETUP.md`
- `src/app/api/cron/orchestrate/route.ts` docstring
- `src/app/api/fetch-news/route.ts` docstring

Backup schedulers:
- Vercel daily backup cron (mentioned in docs; specific `vercel.json` not audited here)
- Manual triggers (route/worker endpoints)

### B) RSS ingestion + API providers (GNews, NewsData)

**Entry point**: `POST /api/fetch-news`  
Worker: `ingest` → `runScalableIngestion(deadline)`

Providers:
- API providers run in parallel: **GNews + NewsData** (`runParallelApiProviders()`)
- RSS runs batched: `runRssBatched()` with default batch size **4 sources/batch**

Timeouts / retries:
- Provider calls use retry wrapper (`withProviderRetry`) and provider-specific `fetchJson` timeouts (GNews example uses `{ timeoutMs: 18_000, retries: 2 }`).
- Ingest is **deadline-aware**: `INFRA_CONFIG.ingestBudgetMs` defaults to **52,000ms**, and stops safely when near deadline.

Deduplication:
- RSS batch dedupes within merged batch via `dedupeArticles(..., { fuzzy: true })` before DB upsert.
- Provider ingest further sanitizes/validates and uses DB-layer dedupe for signals/articles (details below).

Persistence:
- Signals: `persistNewsSignals(...)` ⇒ `news_signals` (raw, never public)
- Legacy bridge: `publishToLegacyArticles(...)` ⇒ `news_articles` (homepage bridge; also creates AI queue rows via `queuedForAI`)

Outputs captured in ingestion logs:
`totalFetched`, `inserted`, `signalsInserted`, `skippedDuplicates`, `failedValidation`, `queuedForAI`, per-provider stats, per-category stats.

Sources:
- `src/lib/news/pipeline/scalable-ingest.ts`
- `src/lib/news/providers/run-provider.ts`
- `src/lib/news/providers/rss-batch.ts`
- `src/lib/news/pipeline/ingest-provider-batch.ts`
- `src/lib/infrastructure/config.ts`

### C) Deduplication, clustering, and event formation

**Canonical clustering**: signals → events.

- Clustering entry: `clusterRecentSignals(limit)` (invoked as job handler `event_cluster`).
- Core algorithm: `clusterSignalsIntoEvents()` in `src/lib/news/ai/event-clustering.ts`
  - Local greedy agglomerative clustering with combined similarity (TF‑IDF + entity overlap; optional embeddings when enabled)
  - Default thresholds: `CLUSTER_THRESHOLD = 0.72`, `TITLE_DUPLICATE_THRESHOLD = 0.88`
  - Default fetch window: `DEFAULT_LIMIT = 120`, `DEFAULT_LOOKBACK_HOURS = 72`

Embeddings (optional):
- Controlled by `NEWSROOM_USE_EMBEDDINGS === "true"` and `OPENAI_API_KEY`.
- Embedding call timeout: `AbortSignal.timeout(12_000)`
- Model default: `text-embedding-3-small`

Outputs:
- `news_events` rows created/updated
- `duplicatesMerged`, `eventsCreated`, `signalsProcessed`, `signalsClustered`
- Each event stores clustering metadata incl. confidence report, urgency score, region/category inference, etc.

Sources:
- `src/lib/news/ai/event-clustering.ts`
- `src/lib/infrastructure/jobs/handlers.ts` (`event_cluster`)

### D) Ranking + editorial scoring (for publish decisions)

Two distinct ranking layers exist:

1) **Homepage ranking** (reader-facing): `rankArticlesForHomepage()` and composition logic (district diversity, desk blocks, shorts rail selection).  
2) **Editorial publish gating** (generation-time): `runEditorialQualityChecks()` and related guards in `generate-article.ts` and `editorial-guards.ts`.

The publish gate is enforced inside generation:
- Draft quality → `publish_allowed` / `hard_reject` with explicit reasons
- Duplicate penalties, hallucination flags, readability/SEO checks, local relevance checks

Sources:
- `src/lib/news/ai/generate-article.ts`
- `src/lib/news/ai/editorial-guards.ts` (referenced by generate-article)
- `src/lib/homepage/generated-feed.ts`, `src/lib/homepage/homepage-composition.ts` (homepage)

### E) AI generation (editorial articles)

Worker: `editorial_generate`

Triggering:
- Canonical path: ingest → event bus enqueue → worker_jobs → `job_processor` (run by orchestrate)
- Backup path: direct worker hits (gated by `editorial-generate-policy`)

Batch sizing + parallelism:
- Per run limit: `INFRA_CONFIG.editorialBatchLimit` default **6**
- Parallel candidate preparation: `runWithConcurrency(pending, INFRA_CONFIG.editorialConcurrency, prepareCandidate)`
  - `INFRA_CONFIG.editorialConcurrency` default **2**, max **4**

LLM settings:
- Default model: `NEWSROOM_EDITORIAL_MODEL || OPENAI_MODEL || "gpt-4o-mini"`
- Editorial request timeout: **28,000ms**
- Output tokens (adaptive): ~**1000–1800** depending on tier (`adaptive-tokens.ts`)

Event selection:
- Fetches `news_events` ordered by `urgency_score` then `created_at`, reads `limit * 20`, filters out events already used by `generated_articles.event_id`, then takes first `limit`.

Outputs:
- `generated_articles` row persisted when published
- `published`, `rejected`, `repaired`, `skipped`, `avgConfidence`

Sources:
- `src/lib/infrastructure/workers/registry.ts` (editorial worker)
- `src/lib/news/ai/generate-article.ts` (`generateEditorialsFromEvents`)
- `src/lib/observability/openai-cost/adaptive-tokens.ts` (max_tokens)
- `docs/QSTASH_SCHEDULER_SETUP.md` (throughput expectations)

### F) Image generation (editorial images)

Worker: `editorial_images` (heavy; may be skipped under deadline pressure)

Queueing:
- When an article is generated, it is enqueued for images (via `queueEditorialImageForArticle`).

Batch sizing + parallelism:
- `INFRA_CONFIG.imageQueueBatch` default **12** (max 16)
- Concurrency default: `INFRA_CONFIG.imageQueueConcurrency` **4**, max 6–8 (via env caps)
- Worker loops up to 6 times per run (in worker registry), and is deadline-aware.

Time bounds:
- Many internal fetches use **12s** timeouts (e.g., source image download)
- Provider generation uses provider-configured timeout (not fully enumerated in this audit)

Source:
- `src/lib/infrastructure/workers/registry.ts` (images worker loop)
- `src/lib/news/ai/generate-editorial-image.ts` (`processEditorialImageQueue`)
- `src/lib/infrastructure/config.ts`

### G) Translation (published generated articles)

Translation is a **job-queue pipeline** (not inline on page renders).

- **Default translation pairs**: `hi→en`, `hi→cg`, `en→hi` (`READER_TRANSLATION_PAIRS`)
- **Expanded targets**: when `NEWSROOM_AUTO_TRANSLATE === "true"`, targets come from `NEWSROOM_TRANSLATE_LANGS` (or `DEFAULT_TRANSLATION_TARGETS`).
- **Jobs**:
  - `translate_article`: `timeoutMs: 120_000`, `maxAttempts: 5`
  - `translation_batch`: `timeoutMs: 180_000`, `maxAttempts: 3` (enqueue driver)
- **LLM call bounds**:
  - Chat completions timeout: **90s**
  - Adaptive body slicing (caps chars) + adaptive `max_tokens` up to **2400**
  - Prompt cache for repeats exists (`lookupPromptCache` / `storePromptCache`)

Scheduler + executor:
- Backfill enqueue schedule: every **6 hours** (`/api/cron/translation-backfill`)
- Normal execution is via **job queue** processed by cron/worker runners (see `processJobBatch`).

Sources:
- `src/lib/i18n/multilingual/translation-queue.ts`
- `src/lib/i18n/multilingual/translate.ts`
- `src/lib/infrastructure/jobs/queue.ts`
- `scripts/setup-qstash-schedules.mjs`

### H) Publishing, cache invalidation, and live refresh

Publishing/ingest invalidation is centralized:
- `revalidateNewsroomCaches({ publishedStories })` is called after ingestion and after editorial generation.
- Orchestrate/ingest also refresh the live homepage snapshot from DB when something changed.

What invalidates (tags/paths):
- Homepage tags: `ISR_TAGS.homepage`, `ISR_TAGS.homepageFeed` + `revalidatePath("/")`
- Category hub: `ISR_TAGS.categories` + `revalidatePath("/category", "layout")`
- Stories: `ISR_TAGS.stories` + `revalidatePath("/story", "layout")`

Sources:
- `src/lib/infrastructure/cache/isr.ts`
- `src/lib/infrastructure/cron/orchestrator.ts`
- `src/app/api/fetch-news/route.ts`

### I) Homepage ranking, district feeds, reader surfaces

Homepage feed build/ranking:
- Pool size: **120** rows (`HOMEPAGE_POOL_LIMIT`)
- Uses the **homepage projection** (`select: "homepage"`)
- Composition enforces diversity and produces “district wire” and other desk blocks.

District feeds:
- Implemented as separate routes and regional utilities; their capacity impact is predominantly **read/rank CPU + Supabase reads**, not write throughput.

Sources:
- `src/lib/homepage/get-feed.ts`
- `src/lib/homepage/generated-feed.ts`
- `src/lib/homepage/homepage-composition.ts`
- `src/lib/regional/*`

### J) Shorts + voice generation

Shorts:
- Built from generated articles and stored in `generated_articles.shorts_metadata` and `generated_articles.editorial_metadata.shorts`.
- Shorts pool query selects a lightweight projection including `shorts_metadata` and `editorial_metadata`.

Voice (TTS):
- Endpoint: OpenAI `/v1/audio/speech`
- Timeout: **60s**
- Price reference (estimator): `tts-1` = **$15 / 1M characters**

Sources:
- `src/lib/news/shorts/build-short.ts`
- `src/lib/news/shorts/voice.ts`
- `src/lib/observability/openai-cost/pricing.ts`

---

## Capacity model (true production capacity from code constraints)

This section answers “TRUE capacity” as **(scheduler cadence × batch limits × concurrency ceilings × timeouts)**, plus the likely real bottlenecks.

### Hard ceilings (cannot exceed without changing schedule/config)

- **Editorial generated & published stories**:
  - Runs: orchestrate at `:15` and `:45` ⇒ **2×/hour**
  - Batch limit: `EDITORIAL_BATCH_LIMIT` default **6**
  - **Ceiling**: **12/hour**, **288/day**

- **Ingest triggers**:
  - fetch-news at `:07` and `:37` ⇒ **2×/hour**
  - Each run has ~60s maxDuration and internal 52s budget, so source count and provider latency bound throughput.

### Soft ceilings (depend on backlog and external limits)

- **AI enrichment (`ai_enrich`)**
  - Micro-batch default 10; each request timeout 8s; can issue up to ~10 parallel enrich calls per micro-batch.
  - Practical throughput limited by OpenAI RPM/TPM and DB write throughput.

- **Editorial images**
  - Concurrency default 4; batch default 12; may be skipped under deadlines.
  - Practical throughput limited by image provider RPM + per-image latency.

- **Translations**
  - `job_processor` throughput limited by job batch size (default 8), orchestrate cadence, and translation call latency (90s timeout).

---

## Article funnel accounting (where to measure each count)

The codebase already produces the canonical accounting fields; a “true capacity” audit should pull these from production.

### Per ingest run (every 30 minutes)

Logged/returned fields:
- **Raw stories collected**: `totalFetched`
- **Validation rejects**: `failedValidation` + `validationStats`
- **Duplicates**: `skippedDuplicates` (legacy bridge) + `signalsSkipped` (signals layer)
- **Signals inserted**: `signalsInserted`
- **Queued for AI enrich**: `queuedForAI` (and pending count via `countPendingAiQueue()`)

Primary record: `ingestion_logs` insert in `runScalableIngestion`.

### Per clustering run

Returned fields:
- `eventsCreated`, `eventsUpdated`, `duplicatesMerged`, `signalsProcessed`, `signalsClustered`

### Per editorial generation run

Returned fields:
- **Generated** (published): `published` (also exposed as `generated`)
- **Rejected**: `rejected`
- **Skipped**: `skipped`
- **Repaired**: `repaired`
- **Quality envelope**: `avgConfidence`

### Per translation backfill / translation runs

Audit provides:
- missing-by-pair counts (`hiMissingEn`, `hiMissingCg`, `enMissingHi`)
- queue state (`queuePending`, `queueDead`, `queueFailed`, `queueStalled`, `deadLetters`)

Sources:
- `src/lib/news/pipeline/scalable-ingest.ts`
- `src/lib/news/ai/event-clustering.ts`
- `src/lib/news/ai/generate-article.ts`
- `src/lib/i18n/multilingual/translation-queue.ts`

---

## Bottlenecks (most likely in production)

### Bottleneck #1: `editorial_generate` (true throughput governor)

Why it governs the entire newsroom:
- The platform can ingest and cluster far more than it can publish.
- The publish ceiling is explicitly controlled via `EDITORIAL_BATCH_LIMIT` and orchestrate cadence.

If you ask “how many articles can we generate,” the truthful answer in production is: **whatever `editorial_generate` can publish**, not whatever ingestion can fetch.

### Bottleneck #2: Images under deadline pressure

Evidence:
- Orchestrator classifies `editorial_images` as a **heavy worker** and may skip it based on remaining function budget.
- This means “images per hour” can fall behind “articles per hour” during busy periods.

### Bottleneck #3: Translation backlog amplification

If each published story enqueues 1–2 translations/day per story (or more under auto-translate), translation jobs scale linearly with publish volume and can become a cost/latency sink.

### Bottleneck #4: External quotas

Variable constraints (must be confirmed from provider dashboards):
- OpenAI org-level RPM/TPM for:
  - chat completions (editorial + translation + shorts summarization)
  - images generation
  - embeddings (if enabled)
- GNews / NewsData quotas

---

## Recommended production capacity (quality-first)

### Current capacity (from architecture)

- **Publish ceiling**: 12/hour; 288/day
- **Designed sustained rate (repo doc)**: ~10–12/hour (implies near ceiling)

### Maximum safe capacity (without quality degradation)

**~150–200/day** (burstable)  
Rationale: keeps enough selectivity to avoid repetition and to keep downstream jobs (images, translation) from accumulating large backlogs.

### Recommended steady-state capacity

**~100/day** (default)  
Rationale: strong editorial selectivity, manageable images/translation spend, and a healthy “regional newspaper cadence” that doesn’t feel spammy.

---

## Quality & product sizing recommendations

### Ideal throughput targets

- **Articles/day**: 80–140 (target 100)
- **Articles/hour (steady)**: 4–6
- **Shorts/day**: 12–30 (only from top-ranked, high-confidence stories)
- **Voiced shorts/day**: 6–15 (voice is a second-order cost + user experience feature)
- **Translated articles/day (reader pairs)**: 40–80

### Why the platform’s ceiling is intentionally high

The architecture supports higher volume to:
- handle breaking periods without manual scaling changes
- keep the homepage live and diverse
- tolerate provider variability

But the **business and quality** sweet spot is lower.

---

## Publishing strategy (regional newspaper model)

### Recommended daily output by desk/category (min / recommended / max)

- **Breaking / urgent**: 5 / 10 / 25
- **State (Chhattisgarh)**: 20 / 35 / 60
- **District (hyperlocal)**: 20 / 35 / 60
- **Politics**: 5 / 10 / 20
- **Crime / public safety**: 5 / 10 / 20
- **Health / education**: 3 / 6 / 12
- **Business**: 3 / 6 / 12
- **Sports**: 3 / 6 / 12
- **Technology**: 2 / 4 / 8
- **Entertainment**: 2 / 4 / 8
- **Opinion / analysis / evergreen**: 1 / 3 / 6

Totals:
- **Minimum** ≈ 69/day
- **Recommended** ≈ 129/day
- **Maximum** ≈ 243/day

This supports your regional identity while keeping the pipeline stable.

---

## Resource usage estimates (order-of-magnitude)

### OpenAI cost drivers (from built-in pricing helpers)

Pricing reference in code: `src/lib/observability/openai-cost/pricing.ts` (July 2025).

- **Editorial text (`gpt-4o-mini`)**: typically fractions of a cent per story at modest token counts.
- **Images (DALL·E class pricing)**: **cents per image**, often the dominant spend if enabled widely.
- **Translations**: moderate; grows with number of target languages and body length.
- **TTS (`tts-1`)**: about **$0.010–$0.020 per short** for typical scripts (hundreds to ~1k chars).

### Supabase / Postgres utilization (qualitative)

High-volume tables/paths:
- `news_signals` upserts during ingestion
- `news_events` writes during clustering
- `generated_articles` inserts during publish
- job queue tables (`worker_jobs`, `worker_job_runs`, dead letters)

### Cron executions

From QStash schedules:
- fetch-news: 48/day
- orchestrate: 48/day
- translation-backfill: 4/day
- cleanup: 1/day
- health: 24/day

Total scheduled executions: **~125/day** (not counting manual runs).

---

## Optimization opportunities (operational; no code changes)

These are “levers” available via **volume policy**, not refactors.

### Reduce over-generation

- Keep steady-state below ceiling:
  - **Target 100/day**
  - Burst higher only during major events

### Increase strictness (publish selectivity)

- Prioritize:
  - higher `urgency_score`
  - higher `source_count` / multi-source clusters
  - Chhattisgarh-tagged events (code already boosts confidence signals)

### Reduce low-value workloads

- If image generation cost is high, scope images to:
  - hero/top stories
  - high-urgency + high-confidence stories

- If translation backlog grows:
  - keep translation targets limited to reader pairs (hi↔en/cg)
  - treat broader translations as premium/limited output

### Reduce shorts/voice volume

- Shorts: keep selective (12–30/day)
- Voice: even more selective (6–15/day)

---

## Estimated savings if volume is reduced (qualitative + simple math)

Let \(A\) be published stories/day.

- **Images** (dominant): if 1 image/story at ~$0.04:
  - Reducing from 200/day → 100/day saves ~100 images/day ⇒ **~$4/day ⇒ ~$120/month**
- **TTS voice**: if 10 voiced shorts/day at ~$0.01 each:
  - small single-digit USD/month changes
- **Translation**: depends on targets; roughly linear in translation jobs/day.

Supabase:
- Lower volume reduces:
  - write amplification (signals/events/articles)
  - downstream reads (more published content means more reader demand; indirect)

---

## Final recommendation (the number)

### Should Jandarpan publish 50, 100, 200, 500/day, or another number?

**Recommendation: publish ~100 articles/day** (steady-state), with:
- **Minimum**: 60–80/day (low-news days)
- **Burst**: 150–200/day (breaking cycles)
- Avoid **500/day**: it is above the “regional newspaper quality” envelope and likely to degrade novelty/local relevance while inflating image/translation costs.

This recommendation is consistent with:
- the system’s hard ceiling (288/day) — you remain below ceiling without constant saturation
- deadline-aware heavy workers (images) — backlog remains manageable
- translation queue dynamics — avoids runaway backlog under reader-pair translations


