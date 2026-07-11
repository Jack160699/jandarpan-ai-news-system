# Vercel Cron Migration Plan — QStash Parallel Validation

**Project:** Jandarpan News (`newspaper-motion`)  
**Production URL:** `https://www.jandarpan.news`  
**Date:** 2026-07-11  
**Status:** Planning only — **no code or infrastructure changes applied in this document**

---

## Goal

Migrate **scheduling** from Upstash QStash to native **Vercel Cron** while:

- Preserving identical newsroom behaviour (ingest → queues → generation → edition publish)
- Keeping all existing API routes unchanged
- **Not** modifying queue processing, EventBus, or publishing logic
- **Not** removing QStash during validation
- Running **both schedulers in parallel** until Vercel crons are proven

---

## Prerequisites (blocking)

| Requirement | Why |
|-------------|-----|
| **Vercel Pro or Enterprise** | Hobby allows cron **once per day** only. This migration requires sub-daily schedules (up to 48×/day). |
| **`CRON_SECRET` on Vercel Production** | Vercel Cron authenticates to route handlers via `CRON_SECRET` + `x-vercel-cron: 1`. |
| **Redis recommended** | Overlap locks (`run-guard`) use Upstash Redis for distributed dedup across serverless instances. Without Redis, in-process locks are weaker under concurrent instances. |
| **QStash left active** | Do not delete Upstash schedules until Phase 4 of rollout. |

---

## 1. QStash scheduled endpoint audit

Source of truth: `scripts/setup-qstash-schedules.mjs`

| # | QStash schedule ID | Cron (as configured today) | Method | Endpoint | Body | Retries | Fires/day |
|---|------------------|------------------------------|--------|----------|------|---------|-----------|
| 1 | `jandarpan-fetch-news` | `7,37 * * * *` | POST | `/api/fetch-news` | *(empty)* | 3 | 48 |
| 2 | `jandarpan-orchestrate` | `15,45 * * * *` | POST | `/api/cron/orchestrate` | `{}` | 3 | 48 |
| 3 | `jandarpan-edition-publish` | `0 6,9,12,15,18,21 * * *` *(UTC)* | POST | `/api/cron/edition-publish` | `{}` | 3 | 6 |
| 4 | `jandarpan-workers-health` | `0 * * * *` | GET | `/api/cron/workers/health` | *(none)* | 3 | 24 |
| 5 | `jandarpan-translation-backfill` | `20 */6 * * *` | POST | `/api/cron/translation-backfill` | `{}` | 3 | 4 |
| 6 | `jandarpan-data-cleanup` | `30 3 * * *` | POST | `/api/cron/cleanup` | `{}` | 3 | 1 |

**Retired (not in active QStash setup):** `jandarpan-editorial-generate` — editorial generation is event-driven via EventBus → `worker_jobs` → `job_processor`.

### Current `vercel.json` (backup layer only)

| Path | Cron | Fires/day | Role today |
|------|------|-----------|------------|
| `/api/fetch-news` | `15 0 * * *` | 1 | Daily ingest backup |
| `/api/cron/worker/editorial_generate` | `45 0 * * *` | 1 | Daily editorial backup (policy-gated) |
| `/api/cron/translation-backfill` | `20 1 * * *` | 1 | Daily translation drain backup |
| `/api/cron/cleanup` | `30 3 * * *` | 1 | Duplicates QStash cleanup |

**Not scheduled anywhere except QStash:** `/api/cron/orchestrate`, `/api/cron/edition-publish`, `/api/cron/workers/health`.

### Edition-publish timezone correction (Vercel side)

QStash `edition-publish` uses plain UTC hours (`0 6,9,12,15,18,21`), which fires at **11:30 IST** etc. — incompatible with `resolveEditionPublishSlot()` (requires IST `minute === 0`).

**Vercel Cron must use UTC times that map to IST `:00`:**

| IST window | UTC cron minute |
|------------|-----------------|
| 06:00 IST | `00:30 UTC` |
| 09:00 IST | `03:30 UTC` |
| 12:00 IST | `06:30 UTC` |
| 15:00 IST | `09:30 UTC` |
| 18:00 IST | `12:30 UTC` |
| 21:00 IST | `15:30 UTC` |

**Vercel expression:** `30 0,3,6,9,12,15 * * *`

This **corrects** edition behaviour relative to broken QStash UTC cron. During parallel validation, QStash edition fires may still no-op (`outside_slot_minute`) while Vercel publishes correctly.

---

## 2. Exact `vercel.json` cron configuration

Apply via `vercel.json.patch` (see repository root). Target state adds **six QStash-mirror crons** and retains **daily backup** entries that do not exact-duplicate a primary schedule.

### Primary schedules (mirror QStash cadence)

```json
{ "path": "/api/fetch-news", "schedule": "7,37 * * * *" }
{ "path": "/api/cron/orchestrate", "schedule": "15,45 * * * *" }
{ "path": "/api/cron/edition-publish", "schedule": "30 0,3,6,9,12,15 * * *" }
{ "path": "/api/cron/workers/health", "schedule": "0 * * * *" }
{ "path": "/api/cron/translation-backfill", "schedule": "20 */6 * * *" }
{ "path": "/api/cron/cleanup", "schedule": "30 3 * * *" }
```

### Retained backups (during validation)

```json
{ "path": "/api/fetch-news", "schedule": "15 0 * * *" }
{ "path": "/api/cron/worker/editorial_generate", "schedule": "45 0 * * *" }
{ "path": "/api/cron/translation-backfill", "schedule": "20 1 * * *" }
```

**Note:** `/api/cron/cleanup` at `30 3 * * *` appears once (same as QStash). The daily `translation-backfill` at `20 1 * * *` is an extra backup fire — harmless; enqueue is deduped.

**Total cron entries after patch:** 9  
**Estimated invocations/day:** ~131 (primary) + 3 (extra backups) ≈ **134**

Vercel Cron invokes **GET** by default. All listed routes implement **GET and POST** handlers — no route changes required.

---

## 3. Dual-scheduler safety model

During validation, **QStash and Vercel both fire** the same endpoints. Safety relies on existing route-level guards — not new business logic.

### Idempotency matrix

| Endpoint | Overlap lock | Duplicate-run behaviour | Edition / publish safety |
|----------|--------------|-------------------------|--------------------------|
| `/api/fetch-news` | **Yes** — `runWorkerEndpoint("fetch-news", 1700)` (~28 min) | Second caller returns `overlap_lock`; no second ingest | N/A |
| `/api/cron/orchestrate` | **Yes** — `runWorkerEndpoint("orchestrate", 1700)` | Second caller returns `overlap_lock` | N/A |
| `/api/cron/edition-publish` | **No overlap lock** | See §3.1 below | **Risk if two schedulers hit same IST `:00` window** |
| `/api/cron/workers/health` | **No** (read-only) | Safe — stats query only | N/A |
| `/api/cron/translation-backfill` | **No** | Enqueue deduped via `worker_jobs` `(job_type, dedupe_key)`; process gated off for non-Vercel unless env flag | N/A |
| `/api/cron/cleanup` | **No** | Retention RPC idempotent; queue purge conditional on backlog threshold | N/A |
| `/api/cron/worker/editorial_generate` | **Yes** — per-worker lock | **Blocked** by `editorial-generate-policy` unless `EDITORIAL_GENERATE_BACKUP_CRON=true` | N/A |

### 3.1 Edition-publish duplicate analysis (critical)

**Per-article idempotency (sequential runs):** After publish, rows leave the candidate set (`workflow_status=scheduled` AND `published_at IS NULL`). A second run in the **same IST window** publishes the **next** batch up to `limit` — it does **not** re-publish the same articles.

**Per-edition budget risk:** The slot `limit` (4–10 articles) applies **per invocation**, not per window globally. Two successful invocations in the same IST `:00` minute can publish **up to 2× the slot limit** if enough scheduled articles exist.

**Concurrent risk:** No overlap lock on `edition-publish`. Near-simultaneous QStash + Vercel hits could race on the same candidate rows.

**Current QStash mitigation (accidental):** Broken UTC cron (`0 6,9,12,15,18,21`) usually returns `outside_slot_minute` — QStash does not publish while Vercel (correct UTC) does.

**If QStash edition cron is fixed to `30 0,3,6,9,12,15 * * *` before cutover:** Both schedulers fire at the same minute — **budget doubling risk** until QStash edition schedule is paused.

**Validation recommendation (no code change):**

1. Deploy Vercel crons with corrected edition schedule.
2. **Do not fix** QStash edition cron to IST-aligned UTC during parallel validation — let QStash no-op.
3. **OR** pause `jandarpan-edition-publish` in Upstash before enabling Vercel edition cron.
4. After QStash cutover, rely on Vercel only for edition publish.

**Future hardening (out of scope — requires code change):** Add `runWorkerEndpoint("edition-publish", …)` overlap lock keyed to IST slot.

### 3.2 Queue / EventBus safety under duplicate orchestrate

| Mechanism | Protection |
|-----------|------------|
| `worker_jobs` dedupe | `(job_type, dedupe_key)` unique among pending/claimed |
| `event_bus_messages` dedupe | `dedupe_key` on insert; duplicate publish returns null |
| `enqueueJob` on conflict | Updates existing pending job instead of duplicating |
| `job_processor` stale reclaim | Reclaims crashed claims; does not double-complete |
| Overlap lock on orchestrate | Prevents concurrent orchestrate runs |

Duplicate orchestrate invocations within 28 minutes: **one runs, one skips** — queue drain rate unchanged.

### 3.3 Ingest safety under duplicate fetch-news

| Mechanism | Protection |
|-----------|------------|
| Overlap lock 1700s | Blocks concurrent ingest |
| DB upsert / URL dedup | Signals and articles deduplicated at persistence layer |
| `publishIngestCompleted` dedupe | `dedupeKey` from `logId` prevents duplicate event rows |
| Queue backpressure | Skips ingest when `pauseIngestion` |

---

## 4. Authentication during migration

| Scheduler | Auth mechanism | Route acceptance |
|-----------|----------------|------------------|
| **QStash** | `Authorization: Bearer CRON_SECRET` + `Upstash-Signature` JWT | `verifyCronRequest` |
| **Vercel Cron** | `CRON_SECRET` (auto-injected) + `x-vercel-cron: 1` | `verifyCronRequest` |

**No `QSTASH_*` changes required** for Vercel Cron migration. Keep signing keys until QStash is decommissioned.

Ensure `CRON_SECRET` is set in **Vercel → Production** environment variables.

---

## 5. Rollout checklist

### Phase 0 — Pre-flight

- [ ] Confirm Vercel plan is **Pro or Enterprise**
- [ ] Confirm `CRON_SECRET` set in Vercel Production
- [ ] Confirm `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set (overlap locks)
- [ ] Screenshot / export current Upstash QStash schedules (rollback reference)
- [ ] Confirm QStash schedules are active and delivering (Upstash → Logs)
- [ ] Baseline queue depths: `worker_jobs` pending, `event_bus_messages` pending, `news_ai_queue`, scheduled articles count

### Phase 1 — Apply `vercel.json` patch

- [ ] Apply `vercel.json.patch` (or merge target `vercel.json` manually)
- [ ] Deploy to **Production** (not preview — crons run on production only)
- [ ] Confirm deploy succeeds (Pro plan accepts sub-daily cron expressions)
- [ ] **Do not** delete or pause QStash schedules

### Phase 2 — Parallel validation (48–72 hours minimum)

Monitor **both** Upstash QStash Logs and Vercel → Functions → Cron / Logs.

#### Per-endpoint checks

| Endpoint | Pass criteria |
|----------|---------------|
| `/api/fetch-news` | HTTP 200; many runs show `overlap_lock` (expected); `ingestion_logs` steady; no 401 |
| `/api/cron/orchestrate` | HTTP 200; `overlap_lock` common; `worker_jobs` pending stable; EventBus pending < 50 |
| `/api/cron/edition-publish` | At IST `:00` windows: Vercel returns `slot` + `published` ≥ 0; **not** `outside_slot_minute` |
| `/api/cron/workers/health` | HTTP 200 hourly from Vercel; 503 only if real backlog (investigate) |
| `/api/cron/translation-backfill` | HTTP 200; `processGate.allowed: false` for Vercel unless backup path (expected) |
| `/api/cron/cleanup` | HTTP 200 daily; retention stats in response |

#### Edition window validation (wait for one full IST cycle)

- [ ] 06:00 IST — Vercel `edition-publish` returns `"slot": "06:00"`
- [ ] Published count ≤ morning half-limit (4)
- [ ] `generated_articles` with `published_at` set increases appropriately
- [ ] No unexpected spike above **40 articles/day** total

#### Dual-scheduler health

- [ ] QStash Logs still show deliveries (primary until cutover)
- [ ] Vercel cron invocations visible at `:07`, `:37`, `:15`, `:45`, etc.
- [ ] `overlap_lock` rate acceptable (indicates dedup working)
- [ ] No sustained 401/403 on either scheduler

### Phase 3 — Promote Vercel to primary (still keep QStash)

- [ ] 72+ hours clean parallel operation
- [ ] Edition publish verified at **at least two** IST windows via Vercel
- [ ] Queue depths comparable to pre-migration baseline
- [ ] Document Vercel as primary scheduler in ops runbook (separate doc PR)

### Phase 4 — QStash decommission (separate change window — not in this PR)

Execute only after Phase 3 sign-off. Order matters:

1. [ ] Pause `jandarpan-fetch-news` in Upstash → wait 1 hour → confirm Vercel ingest continues
2. [ ] Pause `jandarpan-orchestrate` → wait through `:15`/`:45` → confirm orchestrate via Vercel
3. [ ] Pause `jandarpan-workers-health`, `jandarpan-translation-backfill`, `jandarpan-data-cleanup`
4. [ ] Pause `jandarpan-edition-publish` **last** (only after Vercel edition proven over multiple days)
5. [ ] Delete all QStash schedules after 48h stable on Vercel-only
6. [ ] Remove `QSTASH_*` env vars (separate PR)
7. [ ] Remove daily backup crons from `vercel.json` if redundant (optional cleanup PR)

---

## 6. Rollback checklist

Use if Vercel crons cause auth failures, queue runaway, edition over-publish, or deploy rejection.

### Immediate rollback (minutes)

- [ ] Revert `vercel.json` to pre-patch version (4 daily crons only)
- [ ] Deploy Production immediately
- [ ] Confirm QStash schedules still **active** (should be untouched)
- [ ] Verify QStash Logs resume expected delivery volume within 60 minutes

### If edition over-publish suspected

- [ ] Pause Vercel `edition-publish` cron first (revert vercel.json or remove that entry + deploy)
- [ ] Confirm QStash `jandarpan-edition-publish` state (paused or no-op on broken UTC)
- [ ] Audit `generated_articles` published in last window:
  ```sql
  SELECT count(*), date_trunc('hour', published_at AT TIME ZONE 'Asia/Kolkata')
  FROM generated_articles
  WHERE published_at > now() - interval '24 hours'
  GROUP BY 2 ORDER BY 2;
  ```
- [ ] Do not unpublish via automation — escalate to editorial ops

### If orchestrate / ingest stall

- [ ] Confirm QStash `jandarpan-fetch-news` and `jandarpan-orchestrate` are **not** paused
- [ ] Check `overlap_lock` not stuck (Redis TTL expires at 1700s max)
- [ ] Manual recovery: GitHub Actions → Enterprise Workers → Run workflow

### Full rollback to QStash-only

- [ ] Revert `vercel.json` completely
- [ ] Redeploy
- [ ] Recreate any QStash schedules if accidentally deleted (use `UPSTASH_CLICK_BY_CLICK_GUIDE.md`)
- [ ] Verify 131 deliveries/day pattern in Upstash Logs within 24 hours

### Rollback success criteria

- [ ] QStash delivering all 6 schedules
- [ ] `ingestion_logs` updating twice hourly
- [ ] `worker_jobs` draining
- [ ] Edition windows publishing (via QStash after IST cron fix, or Vercel if edition cron kept during partial rollback)

---

## 7. What this migration does NOT change

| Layer | Status |
|-------|--------|
| API route handlers | Unchanged |
| Queue processing (`worker_jobs`, `processJobBatch`) | Unchanged |
| EventBus (`event-bus.ts`) | Unchanged |
| Publishing logic (`edition-scheduler.ts`, `publication.ts`) | Unchanged |
| QStash schedules | **Remain active** until Phase 4 |
| `@upstash/qstash` dependency | Remains until QStash decommission PR |

---

## 8. Files produced

| File | Purpose |
|------|---------|
| `VERCEL_CRON_MIGRATION_PLAN.md` | This document |
| `vercel.json.patch` | Unified diff to apply to `vercel.json` |
| Rollout checklist | §5 |
| Rollback checklist | §6 |

---

## 9. Apply the patch

```bash
# From repository root (newspaper-motion/)
git apply vercel.json.patch
# Review vercel.json, then deploy to Production
```

Or merge the target `crons` array manually per §2.

---

*Planning artifact only. No application code, QStash schedules, or deployments were modified.*
