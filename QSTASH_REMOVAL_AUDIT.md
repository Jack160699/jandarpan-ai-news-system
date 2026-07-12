# QStash Removal Architecture Audit — Premium AI Newsroom

**Role:** Chief Platform Architect review  
**Date:** 2026-07-11  
**Scope:** Static repository audit — no code modified, no production telemetry queried  
**Question:** After the edition-based Premium AI Newsroom workflow, is Upstash QStash still required?

---

## Executive verdict

**QStash is not part of the newsroom business logic.** It is only an **external HTTP scheduler** that invokes existing Next.js route handlers. All durable work — ingestion, generation, publishing, retries, and fan-out — already lives in **Supabase Postgres queues**, the **EventBus**, and **route-handler workers**.

| Deployment context | Is QStash required? |
|--------------------|---------------------|
| **Vercel Hobby** (sub-daily pipeline) | **Yes** — or an equivalent external scheduler. Hobby cron is limited to **once per day** per job with **hour-level precision** (±59 min). |
| **Vercel Pro / Enterprise** | **No** — all six active QStash schedules can be replaced by `vercel.json` crons with per-minute precision. |
| **Redis (Upstash)** | **Independent of QStash** — remains valuable for cache, rate limits, and overlap locks even if QStash is removed. |

The **edition-based workflow reduces QStash load** (retired `jandarpan-editorial-generate`, added low-frequency `edition-publish`) but **does not eliminate** the need for sub-daily ingest and orchestrate triggers on Hobby.

**Recommendation:** Treat QStash removal as a **scheduler consolidation** project, not a pipeline rewrite. Target state: **Vercel Pro + `vercel.json` crons** as the single scheduler, Postgres queues unchanged, Redis optional but recommended.

---

## 1. Every QStash usage in the repository

| Location | Usage type | Runtime? | Purpose |
|----------|------------|----------|---------|
| `scripts/setup-qstash-schedules.mjs` | `@upstash/qstash` `Client` | No — ops script | Create/delete Upstash schedules via API |
| `src/lib/infrastructure/auth/cron-auth.ts` | `@upstash/qstash` `Receiver` | **Yes** | Verify `Upstash-Signature` JWT on inbound cron HTTP requests |
| `package.json` → `qstash:setup` | Script entry | No | Wrapper for setup script |
| Comments in routes (`fetch-news`, `orchestrate`, policies) | Documentation | N/A | Describe QStash as primary trigger |
| `docs/QSTASH_SCHEDULER_SETUP.md`, migration guides | Ops docs | N/A | Runbooks |
| `.env.example` | Env template | N/A | `QSTASH_*` vars commented |

**QStash is never used as a message queue, pub/sub broker, or retry store.** It only schedules HTTP `GET`/`POST` to existing API routes and optionally retries failed deliveries (3×).

**No code path publishes messages to QStash at runtime** — only the setup script talks to the QStash management API.

---

## 2. Every schedule

### 2.1 Active QStash schedules (canonical: `setup-qstash-schedules.mjs`)

| Schedule ID | Cron | Endpoint | Method | Deliveries/day |
|-------------|------|----------|--------|----------------|
| `jandarpan-fetch-news` | `7,37 * * * *` | `/api/fetch-news` | POST | 48 |
| `jandarpan-orchestrate` | `15,45 * * * *` | `/api/cron/orchestrate` | POST | 48 |
| `jandarpan-edition-publish` | `0 6,9,12,15,18,21 * * *` *(UTC — known IST bug)* | `/api/cron/edition-publish` | POST | 6 |
| `jandarpan-workers-health` | `0 * * * *` | `/api/cron/workers/health` | GET | 24 |
| `jandarpan-translation-backfill` | `20 */6 * * *` | `/api/cron/translation-backfill` | POST | 4 |
| `jandarpan-data-cleanup` | `30 3 * * *` | `/api/cron/cleanup` | POST | 1 |
| **Total** | | | | **131** |

### 2.2 Retired QStash schedules (delete if still present)

| Schedule ID | Was | Status in edition workflow |
|-------------|-----|----------------------------|
| `jandarpan-editorial-generate` | `10,40 * * * *` → editorial worker | **Retired** — generation is event-driven |
| `jandarpan-ai-enrich`, `jandarpan-editorial-images`, `jandarpan-job-processor` | Decomposed workers | **Legacy** — folded into `orchestrate` |
| `jandarpan-ingest` | Duplicate ingest | **Remove if present** |

### 2.3 Vercel Cron schedules (`vercel.json` — backup layer)

| Path | Cron (UTC) | Role |
|------|------------|------|
| `/api/fetch-news` | `15 0 * * *` | Daily ingest backup |
| `/api/cron/worker/editorial_generate` | `45 0 * * *` | Daily editorial backup |
| `/api/cron/translation-backfill` | `20 1 * * *` | Daily translation drain backup |
| `/api/cron/cleanup` | `30 3 * * *` | Daily cleanup (duplicates QStash cleanup) |

**No Vercel cron exists for `edition-publish` or `orchestrate`.** Edition publishing is QStash-only today.

### 2.4 GitHub Actions (`.github/workflows/workers.yml`)

**Manual only** (`workflow_dispatch`). Not a production scheduler.

### 2.5 Edition workflow impact on scheduling

| Concern | Before (high-frequency) | After (edition-based) |
|---------|---------------------------|------------------------|
| Editorial generation schedule | Dedicated QStash every 30 min | **Removed** — `ingest.completed` → `worker_jobs` → `job_processor` |
| Publishing schedule | Continuous / auto-publish | **New** `edition-publish` 6×/day IST |
| Ingest / orchestrate cadence | 48×/day each | **Unchanged** — still 48×/day |
| Total QStash fires | ~180+/day (with editorial cron) | **131/day** |

The edition workflow **reduces schedule count and publish frequency** but **does not remove** the need for sub-daily ingest and queue draining.

---

## 3. Every queue

All job queues are **Postgres (Supabase)**. QStash does not store queue state.

| Queue table | Producer(s) | Consumer(s) | Drained by |
|-------------|-------------|-------------|------------|
| `worker_jobs` | EventBus, translation backfill, admin actions | `job_processor` worker | `orchestrate` cron (via `processJobBatch`) |
| `event_bus_messages` | Ingest, publish, intelligence events | `deliverPendingEvents` | `job_processor` inside `orchestrate` |
| `news_ai_queue` | Scalable ingest | `ai_enrich` worker | `orchestrate` |
| `editorial_image_queue` | Post-generate image enqueue | `editorial_images` worker | `orchestrate` |
| `worker_dead_letters` | Failed jobs after max attempts | Manual ops / requeue scripts | Not scheduled |

**Scheduler choice does not change queue design.** Any HTTP cron (QStash or Vercel) that hits `/api/cron/orchestrate` drains the same queues.

---

## 4. Every publish trigger

| Trigger | Mechanism | Scheduler dependency |
|---------|-----------|---------------------|
| **Edition windows** | `edition-publish` cron → `publishScheduledForCurrentEdition()` → `workflow_status=scheduled` rows | Needs **6×/day** HTTP trigger (QStash today; Vercel Cron on Pro) |
| **Breaking override** | Inline in `generate-article.ts` during generation (`breakingUnlimited` + tier rules) | **None** — runs inside `job_processor` / generation |
| **Desk / admin publish** | `publication.ts` / editorial workflow UI | **None** — user-initiated |
| **Legacy auto-publish flag** | `NEWSROOM_AUTO_PUBLISH=true` now means **schedule for edition**, not immediate publish | Edition cron still required for non-breaking stories |
| **Post-publish fan-out** | `publishArticlePublished()` → translations, shorts, `articles.published` event | **None** — synchronous/event-bus after publish |

**Edition workflow decoupled generation from publishing.** QStash is only relevant for the **edition-publish cron endpoint**, not for the publish logic itself.

---

## 5. Every retry mechanism

| Layer | Where | What retries | Replaced by Vercel Cron? |
|-------|-------|--------------|--------------------------|
| **QStash HTTP delivery** | Upstash schedule config (`retries: 3`) | Failed HTTP to route (5xx, timeout, network) | **Partially** — Vercel Cron does not automatically retry failed function invocations the same way; next cron tick acts as implicit retry |
| **`worker_jobs`** | `queue.ts` + `retry.ts` | Job handlers with exponential backoff, dead-letter at `max_attempts` | **Already internal** — independent of QStash |
| **`event_bus_messages`** | `event-bus.ts` | Up to 3 delivery attempts, 5s×attempt delay | **Already internal** |
| **`news_ai_queue`** | `ai-queue-retry.ts` | Encoded retry metadata in `error` column | **Already internal** |
| **Editorial images** | `editorial-image-retry.ts` | Image generation retries | **Already internal** |
| **Overlap locks** | `run-guard.ts` + Redis dedup | Prevents duplicate concurrent cron runs | **Still needed** when dual-scheduler overlap exists during migration |

**Removing QStash does not remove application retry logic.** The only loss is QStash’s **transport-layer** HTTP retries (3× per scheduled fire). Mitigation: overlap locks + next scheduled tick + Postgres job retries.

---

## 6. Every EventBus consumer

### 6.1 Topics and downstream jobs (`event-bus.ts`)

| Topic | Enqueued job types | Consumer path |
|-------|-------------------|---------------|
| `ingest.completed` | `editorial_generate`, `event_cluster`, `intelligence_snapshot`, `analytics_aggregate` | `deliverPendingEvents` → `worker_jobs` → `job_processor` |
| `signals.created` | `embed_signals`, `intelligence_cluster` | Same |
| `articles.published` | `embed_articles`, `seo_analysis`, `intelligence_snapshot` | Same (tier-1 only at publish time) |
| `intelligence.refresh` | `intelligence_snapshot` | Same |
| `dam.asset.uploaded` | `dam_analyze` | Same |
| `analytics.refresh` | `analytics_aggregate` | Same |

### 6.2 Who calls `deliverPendingEvents`

| Caller | Trigger |
|--------|---------|
| `runJobProcessor` (`intelligence-workers.ts`) | Every `orchestrate` cron run |
| `handleCronJobs` (`handlers.ts`) | `/api/cron/jobs` (manual / legacy) |

**EventBus does not need QStash.** It needs something to run `orchestrate` frequently enough to drain `event_bus_messages` before backlog grows.

---

## 7. Every background worker

### 7.1 Queue workers (`registry.ts` + `intelligence-workers.ts`)

| Worker ID | Function | Typical trigger |
|-----------|----------|-----------------|
| `ingest` | `runScalableIngestion` | `/api/fetch-news` (not in default orchestrate pipeline) |
| `ai_enrich` | `news_ai_queue` batch | `orchestrate` |
| `editorial_generate` | `generateEditorialsFromEvents` | `job_processor` job (canonical); direct cron **blocked** by policy |
| `editorial_images` | Editorial image queue | `orchestrate` |
| `job_processor` | Event delivery + `worker_jobs` drain | `orchestrate` |
| `intelligence_embed` | Signal/article embeddings | `orchestrate` |
| `intelligence_snapshot` | Snapshot precompute | `orchestrate` |
| `analytics_aggregate` | Analytics rollups | `orchestrate` |
| `dam_analyze` | DAM vision AI | `orchestrate` / jobs |
| `event_cluster` | Signal clustering | `orchestrate` / jobs |

### 7.2 Default orchestrate pipeline (`orchestrator.ts`)

```
ai_enrich → job_processor → intelligence_embed → intelligence_snapshot
         → analytics_aggregate → editorial_images
```

(`ingest` and `editorial_generate` are **not** in the default pipeline — by design in the edition workflow.)

### 7.3 Worker invocation surfaces

| Surface | Auth | Scheduled today by |
|---------|------|-------------------|
| `/api/cron/orchestrate` | `verifyCronRequest` | QStash |
| `/api/fetch-news` | `verifyCronRequest` | QStash |
| `/api/cron/worker/[name]` | `verifyCronRequest` | Manual / GHA / Vercel daily backup (editorial only) |
| `/api/cron/edition-publish` | `verifyCronRequest` | QStash |
| `/api/cron/jobs` | `verifyCronRequest` | Manual only |

**All workers are plain Next.js route handlers.** QStash is only the clock.

---

## 8. Every Upstash dependency

| Product | Required? | Coupled to QStash? |
|---------|-----------|-------------------|
| **QStash** (scheduling) | Only on Hobby for sub-daily | N/A |
| **QStash signing keys** (`QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`) | Only if QStash delivers traffic | Yes |
| **QSTASH_TOKEN** | Setup script only | Yes |
| **Redis REST** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) | Optional but recommended in production | **No** — separate product |

### Redis usage (independent)

| Feature | File(s) |
|---------|---------|
| Homepage / dashboard cache | `cache/redis.ts`, ISR helpers |
| Rate limiting | `rate-limit.ts`, `security/rate-limit.ts` |
| Worker overlap locks | `run-guard.ts`, `cache/dedup.ts` |
| Health checks | `observability/health/checks.ts` |

Redis uses raw REST `fetch`, not `@upstash/redis` package (removed per engineering audit).

**Removing QStash does not remove Upstash Redis** unless you also migrate cache to Postgres-only / Vercel Runtime Cache.

---

## 9. Every Redis dependency

See §8. Redis is **not a job broker**. Degraded mode falls back to in-memory cache and Postgres snapshots (`HOBBY_DEPLOYMENT_MODE.md`).

| If Redis unavailable | Impact |
|---------------------|--------|
| Overlap locks | In-process fallback — **weaker** on multi-instance serverless |
| Dashboard cache | Higher Supabase egress |
| Rate limits | In-memory fallback per instance |

**QStash removal does not change Redis requirements.**

---

## 10. Every cron endpoint

| Endpoint | QStash? | Vercel Cron? | Registered job ID | Notes |
|----------|---------|--------------|-------------------|-------|
| `POST /api/fetch-news` | Primary (48/day) | Backup (1/day) | `fetch-news` | Wire/RSS ingest |
| `POST /api/cron/orchestrate` | Primary (48/day) | **None** | `orchestrate` | Queue + EventBus drain |
| `POST /api/cron/edition-publish` | Primary (6/day) | **None** | `edition-publish` | IST slot publishing |
| `GET /api/cron/workers/health` | Primary (24/day) | **None** | — | Health monitoring |
| `POST /api/cron/translation-backfill` | Primary (4/day) | Backup (1/day) | `translation-backfill` | Enqueue-only by default |
| `POST /api/cron/cleanup` | Primary (1/day) | Backup (1/day) | `cleanup` | Duplicate schedule |
| `POST /api/cron/worker/editorial_generate` | Retired | Backup (1/day) | `editorial_generate` | Gated off unless backup env |
| `POST /api/cron/worker/[name]` | No | No | — | Manual / decomposed recovery |
| `POST /api/cron/jobs` | No | No | — | Manual job drain |
| `POST /api/cron/cluster` | No | No | — | Manual clustering recovery |
| `POST /api/cron/revalidate` | No | No | — | ISR bust |
| `POST /api/generate-articles` | No | No | — | Manual generation |
| `POST /api/process-ai` | No | No | — | Manual AI queue |
| `POST /api/process-editorial-images` | No | No | — | Manual image queue |

---

## Per-component replacement matrix

| Component | QStash role today | Replace with Vercel Cron (Pro)? | Replace with EventBus / worker queue? | Replace with existing retry logic? |
|-----------|-------------------|--------------------------------|---------------------------------------|-----------------------------------|
| Ingest trigger | HTTP schedule | **Yes** — `7,37 * * * *` | **No** — providers need periodic poll | N/A |
| Orchestrate trigger | HTTP schedule | **Yes** — `15,45 * * * *` | **No** — needs periodic drain | N/A |
| Edition publish trigger | HTTP schedule | **Yes** — `CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *` | **No** — time-window gate is in route | N/A |
| Workers health | HTTP schedule | **Yes** — `0 * * * *` | **No** | N/A |
| Translation backfill scan | HTTP schedule | **Yes** — `20 */6 * * *` | Partial — event path covers new publishes | N/A |
| Data cleanup | HTTP schedule | **Yes** — `30 3 * * *` | **No** | N/A |
| Editorial generation | *(retired QStash)* | Not needed | **Yes** — already canonical via EventBus | `worker_jobs` retries |
| Job processing | Inside orchestrate | Via orchestrate cron | **Yes** — already Postgres queue | `worker_jobs` retries |
| Event delivery | Inside job_processor | Via orchestrate cron | **Yes** — already `event_bus_messages` | EventBus retries |
| HTTP delivery retries | QStash `retries: 3` | Next cron tick + overlap skip | **No** | App-level retries only |
| Cron authentication | Bearer + QStash JWT | `CRON_SECRET` + `x-vercel-cron` | N/A | N/A |
| Schedule provisioning | `setup-qstash-schedules.mjs` | `vercel.json` + deploy | N/A | N/A |

---

## A. Components that absolutely require QStash

**On Vercel Hobby — these require QStash or another external sub-daily scheduler:**

| Component | Why absolute |
|-----------|--------------|
| **Sub-daily ingest** (`/api/fetch-news` × 48/day) | Hobby cron cannot run more than once per day |
| **Sub-daily orchestrate** (`/api/cron/orchestrate` × 48/day) | Same — queue/EventBus stall without it |
| **Hourly health** (`/api/cron/workers/health` × 24/day) | Same |
| **6-hourly translation scan** | Same |
| **6×/day edition publish** | Same (6 > 1 per day) |

**On Vercel Pro — nothing absolutely requires QStash.** All of the above map 1:1 to `vercel.json` cron entries.

**Nothing in the application runtime calls the QStash Client API.** The only hard runtime coupling is optional `Receiver` signature verification in `cron-auth.ts`.

---

## B. Components that can be migrated to Vercel Cron

**Requires Vercel Pro** (per-minute scheduling, per-minute precision).

| Current QStash schedule | Proposed `vercel.json` cron | Notes |
|-------------------------|----------------------------|-------|
| `jandarpan-fetch-news` | `{ "path": "/api/fetch-news", "schedule": "7,37 * * * *" }` | Keep overlap lock (`run-guard`) |
| `jandarpan-orchestrate` | `{ "path": "/api/cron/orchestrate", "schedule": "15,45 * * * *" }` | Body `{}` not needed — route accepts empty POST |
| `jandarpan-edition-publish` | `{ "path": "/api/cron/edition-publish", "schedule": "30 0,3,6,9,12,15 * * *" }` | UTC equivalent of IST `:00` windows; or use Vercel cron with IST comment in ops doc |
| `jandarpan-workers-health` | `{ "path": "/api/cron/workers/health", "schedule": "0 * * * *" }` | |
| `jandarpan-translation-backfill` | `{ "path": "/api/cron/translation-backfill", "schedule": "20 */6 * * *" }` | Remove duplicate daily Vercel backup after cutover |
| `jandarpan-data-cleanup` | `{ "path": "/api/cron/cleanup", "schedule": "30 3 * * *" }` | Consolidate — drop QStash duplicate |

**Optional consolidation:** Merge fetch + orchestrate into a single `/api/cron/pipeline` route (future code change) to halve cron invocations. Not required for QStash removal.

**Auth after migration:** Vercel Cron sends `x-vercel-cron: 1` + `CRON_SECRET` when configured. `QSTASH_*_SIGNING_KEY` env vars become unnecessary.

---

## C. Components that become dead code

*After full cutover to Vercel Pro crons (would be removed in a later code cleanup PR — listed here for planning only):*

| Artifact | Why dead |
|----------|----------|
| `scripts/setup-qstash-schedules.mjs` | No Upstash schedules to provision |
| `pnpm qstash:setup` | Same |
| `docs/QSTASH_SCHEDULER_SETUP.md` as primary scheduler doc | Superseded by `vercel.json` |
| `QSTASH_MIGRATION.md`, `UPSTASH_CLICK_BY_CLICK_GUIDE.md` | Historical ops artifacts |
| QStash signature branch in `cron-auth.ts` | No `Upstash-Signature` header inbound |
| `@upstash/qstash` npm dependency | Only used by setup script + Receiver |
| Env vars `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | No consumers |
| `EditorialGenerateTrigger: "scheduled_cron"` policy path | Already **blocks** direct editorial cron unless `EDITORIAL_GENERATE_BACKUP_CRON=true` |
| `TranslationBackfillTrigger: "scheduled_cron"` process path | Already **blocks** unless `TRANSLATION_BACKFILL_PROCESS=true` |

**Not dead code** (keep regardless):

- All `/api/cron/*` route handlers
- EventBus, `worker_jobs`, orchestrator, workers registry
- Redis cache layer
- `vercel.json` crons (become primary instead of backup)
- GitHub Actions manual workflow (disaster recovery)

---

## D. Components that should be deleted

### Infrastructure / ops (no code change in this audit)

| Delete | When |
|--------|------|
| All six Upstash QStash schedules | After Vercel crons verified 48–72h |
| Upstash QStash signing keys from Vercel env | After QStash schedules deleted |
| `QSTASH_TOKEN` from any CI secrets | After setup script retired |
| Retired schedules (`jandarpan-editorial-generate`, decomposed workers) | Immediately if still present |

### Code / docs (follow-up PR after cutover)

| Delete | Risk if removed too early |
|--------|---------------------------|
| `@upstash/qstash` package | Low after cutover |
| `setup-qstash-schedules.mjs` | Low |
| QStash docs | Low — replace with Vercel cron runbook |
| Duplicate daily Vercel backup crons | Medium — only after Pro crons prove stable |

### Do **not** delete

| Keep | Reason |
|------|--------|
| Upstash **Redis** | Cache, rate limits, overlap locks |
| Postgres queue tables | Core architecture |
| `CRON_SECRET` | Still required for Vercel Cron auth |
| `/api/cron/orchestrate`, `/api/fetch-news`, `/api/cron/edition-publish` | Business logic |

---

## E. Migration plan requiring ZERO downtime

### Prerequisites

- [ ] Confirm **Vercel Pro** (or Enterprise) on `newspaper-motion` — Hobby cannot host target crons.
- [ ] Export screenshot of current QStash schedules (rollback reference).
- [ ] Confirm `CRON_SECRET` set on Vercel Production.
- [ ] Confirm Redis overlap locks configured (recommended for parallel scheduler window).

### Phase 0 — Fix edition-publish cron (can do on QStash now)

Apply `CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *` per `QSTASH_MIGRATION.md` so publishing works before any platform migration.

### Phase 1 — Add Vercel crons in parallel (no QStash deletion)

1. Add all six Pro cron entries to `vercel.json` (mirror QStash cadence).
2. Deploy to production.
3. **Both** QStash and Vercel fire the same endpoints for 48–72 hours.
4. Overlap locks (`run-guard`) prevent double ingest/orchestrate on most workers.
5. Monitor: Vercel Functions logs, `cron-monitor` table, QStash Logs, queue depths.

**Expected behavior during overlap:** Many runs return `{ "skipped": true, "reason": "overlap_lock" }` — this is correct, not an error.

### Phase 2 — Validate Vercel as primary

| Check | Pass criteria |
|-------|---------------|
| Ingest | `ingestion_logs` steady; `news_signals` growing |
| Orchestrate | `worker_jobs` pending count stable; EventBus pending < 50 |
| Edition publish | At IST `:00`, `edition-publish` returns valid `slot`, not `outside_slot_minute` |
| Health | `/api/cron/workers/health` 200 hourly from Vercel |
| No auth failures | No 401 spikes after deploy |

Compare `x-vercel-cron` invocations vs QStash in logs. Vercel should show successful runs at scheduled minutes.

### Phase 3 — Disable QStash (reversible)

1. Pause or delete QStash schedules **one at a time**, lowest risk first:
   - `jandarpan-data-cleanup` (Vercel already duplicates)
   - `jandarpan-workers-health`
   - `jandarpan-translation-backfill`
   - `jandarpan-edition-publish` (only after Vercel edition cron verified at one full IST window)
   - `jandarpan-fetch-news`
   - `jandarpan-orchestrate` (last — highest impact)
2. Wait one full cron cycle after each deletion.
3. Rollback: recreate schedule from `UPSTASH_CLICK_BY_CLICK_GUIDE.md` if anomalies appear.

### Phase 4 — Decommission QStash auth

1. Remove `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` from Vercel env.
2. Redeploy.
3. Confirm cron routes still authorize via `CRON_SECRET` / `x-vercel-cron`.

### Phase 5 — Code and docs cleanup (separate PR)

Remove setup script, `@upstash/qstash`, stale docs, duplicate backup crons in `vercel.json`.

### Zero-downtime guarantees

| Risk | Mitigation |
|------|------------|
| Missed cron tick | Parallel schedulers during Phase 1–2 |
| Double processing | Redis / memory overlap locks |
| Edition miss | Do not delete QStash edition schedule until Vercel edition cron proven |
| Auth break | Keep `CRON_SECRET`; only remove signing keys after QStash traffic stops |

---

## F. Expected reduction in complexity

| Area | Today | After QStash removal (Pro + Vercel Cron) |
|------|-------|------------------------------------------|
| Schedulers | 3 layers (QStash primary, Vercel backup, GHA manual) | **1 primary** (Vercel) + GHA manual DR |
| Secrets | `CRON_SECRET` + 3× `QSTASH_*` | **`CRON_SECRET` only** for cron auth |
| Provisioning | Upstash Console + `setup-qstash-schedules.mjs` | **`vercel.json` + git deploy** |
| Auth paths | Bearer OR QStash JWT OR `x-vercel-cron` | Bearer OR `x-vercel-cron` |
| Ops runbooks | QStash + Vercel + migration guides | Single Vercel cron doc |
| npm dependencies | `@upstash/qstash` | Removed |
| Timezone hazards | QStash UTC vs IST edition slots | Centralized in `vercel.json` with explicit UTC mapping |
| Duplicate fires | QStash + Vercel daily on same endpoints | Eliminated after backup crons pruned |

**Net complexity:** **Medium–high reduction** in operational surface area. **No reduction** in application pipeline complexity (queues, workers, EventBus unchanged).

---

## G. Expected reduction in operational risk

| Risk | Today (QStash) | After migration |
|------|----------------|-----------------|
| Edition publish timezone mismatch | **Active** — UTC cron vs IST resolver | **Lower** — explicit UTC cron in `vercel.json` |
| Apex domain 307 breaking JWT URL match | QStash signature failures | **Gone** — no QStash signatures |
| Scheduler drift (docs vs live) | High — multiple sources of truth | **Lower** — `vercel.json` in repo |
| Secret sprawl (3 QStash vars) | Medium | **Lower** |
| Single-vendor scheduler failure | Upstash outage stops pipeline | Vercel outage stops pipeline — **same class, different vendor** |
| Hobby imprecise cron | N/A (using QStash) | **Must be on Pro** — Pro imprecision is per-minute |
| Dual-fire during migration | Overlap locks | Temporary — ends after cutover |

**Net operational risk:** **Moderate reduction** if edition cron is fixed and Pro is used. **Do not migrate on Hobby** — that would **increase** risk (daily-only pipeline).

---

## H. Expected reduction in infrastructure cost

| Item | Estimated current | After removal |
|------|-------------------|---------------|
| **QStash** | ~131 HTTP deliveries/day ≈ **4,000/month** — typically within Upstash free/low tier ($0–10/mo) | **$0** |
| **Vercel plan** | Hobby ($0) + QStash | **Pro ~$20/mo per seat** minimum if not already on Pro |
| **Vercel function invocations** | 131 QStash + 4 Vercel daily ≈ 135/day | ~131/day (similar; minor savings if duplicate backups removed) |
| **Upstash Redis** | Unchanged | Unchanged |
| **Supabase** | Unchanged | Unchanged |
| **Engineering time** | Ongoing dual-scheduler ops | One-time migration; then lower |

**Financial summary:**

- If already on **Vercel Pro**: QStash removal saves a small Upstash bill and ops time; **net cost ≈ flat to slightly negative**.
- If on **Vercel Hobby**: QStash removal **requires Pro upgrade** — **net cost likely increases ~$20/mo** unless you eliminate a paid seat elsewhere.

**Cost is not the primary driver.** Scheduler consolidation and IST reliability are.

---

## Final recommendation

| Question | Answer |
|----------|--------|
| Is QStash required for the **edition workflow logic**? | **No** |
| Is QStash required for **sub-daily scheduling on Vercel Hobby**? | **Yes** |
| Can the entire platform run without QStash? | **Yes, on Vercel Pro** with `vercel.json` crons |
| Should Redis be removed with QStash? | **No** — independent concern |
| Should you remove QStash before fixing edition IST cron? | **No** — fix publish window first |

**Recommended path:**

1. **Short term:** Keep QStash on Hobby, fix `edition-publish` timezone (per migration guides).
2. **Medium term:** Upgrade to Vercel Pro if not already; parallel-run Vercel crons; decommission QStash.
3. **Long term:** Single scheduler in git (`vercel.json`), delete QStash artifacts in a focused cleanup PR.

The Premium AI Newsroom architecture — Postgres queues, EventBus, edition scheduler, tier gating — is **scheduler-agnostic**. QStash was an infrastructure workaround for Vercel Hobby limits, not a core platform dependency.

---

## Appendix — Source files reviewed

| Category | Paths |
|----------|-------|
| QStash setup | `scripts/setup-qstash-schedules.mjs` |
| Cron auth | `src/lib/infrastructure/auth/cron-auth.ts` |
| Schedulers | `vercel.json`, `registered-jobs.ts` |
| Orchestration | `orchestrator.ts`, `handlers.ts`, `registry.ts`, `intelligence-workers.ts` |
| EventBus | `src/lib/infrastructure/events/event-bus.ts` |
| Queues | `jobs/queue.ts`, `jobs/retry.ts`, `news/ai/queue.ts`, `news/ai/ai-queue-retry.ts` |
| Edition publish | `edition-scheduler.ts`, `api/cron/edition-publish/route.ts`, `generate-article.ts` |
| Policies | `editorial-generate-policy.ts`, `translation-policy.ts` |
| Redis | `cache/redis.ts`, `workers/run-guard.ts` |
| Ops docs | `HOBBY_DEPLOYMENT_MODE.md`, `QSTASH_MIGRATION.md`, `GITHUB_ACTIONS_WORKERS.md` |

---

*Audit complete. No application code, commits, or deployments were performed.*
