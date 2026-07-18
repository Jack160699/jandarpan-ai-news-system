# Jandarpan Pipeline Audit

**Date:** July 2026  
**Scope:** Editorial ingestion → AI queue → orchestration → edition publish (final implemented state)  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  
**Schedulers:** Vercel Cron (`vercel.json`) + Upstash QStash (`scripts/setup-qstash-schedules.mjs`, `@upstash/qstash`)  

---

## 1. Verdict

The **canonical editorial generation path** is implemented and documented in code as:

```text
fetch-news → ingest.completed → worker_jobs → job_processor (orchestrate) → edition-publish
```

Intelligence / enrichment workers (`ai_enrich`, `editorial_images`, `job_processor`, etc.) run **inside** the scheduled `orchestrate` endpoint rather than as separate top-level cron entries. Admin visibility for this chain lives primarily under the **Technical** workspace (`/admin/technical`, `/admin/system`, `/admin/ingestion`, `/admin/health`).

Live throughput, failure rates, and DLQ depth were **not sampled from production** in this agent session.

---

## 2. Canonical stages

| Stage | Entry | Purpose |
|-------|-------|---------|
| Fetch | `/api/fetch-news` | Pull provider feeds; seed ingestion |
| Ingest complete | Internal event / DB state | Marks batch ready for workers |
| AI / worker queue | `worker_jobs` (+ admin AI queue views) | Generation, enrichment, images, translation jobs |
| Orchestrate | `/api/cron/orchestrate` | Drains / processes jobs (job_processor) |
| Edition publish | `/api/cron/edition-publish` | Publishes edition windows on schedule |
| Backups / hygiene | `editorial_generate`, `translation-backfill`, `cleanup` | Daily/backup drains and retention |

Source of registered job IDs: `src/lib/infrastructure/cron/registered-jobs.ts`.

---

## 3. Vercel cron schedule (implemented in `vercel.json`)

| Path | Schedule (cron) |
|------|-----------------|
| `/api/fetch-news` | `7,37 * * * *` (twice hourly) |
| `/api/cron/orchestrate` | `15,45 * * * *` (twice hourly) |
| `/api/cron/edition-publish` | `30 0,3,6,9,12,15 * * *` (every 3 hours at :30) |
| `/api/cron/workers/health` | `0 * * * *` |
| `/api/cron/translation-backfill` | `20 */6 * * *` |
| `/api/cron/cleanup` | `30 3 * * *` |
| `/api/cron/competitor-tracker` | `0,30 * * * *` |
| `/api/cron/seo-intelligence` | `5,35 * * * *` |
| `/api/cron/serp-tracker` | `0 2,14 * * *` |
| `/api/cron/gsc-intelligence` | `30 3 * * *` |
| `/api/cron/seo-autonomous` | `0 */6 * * *` |

QStash remains part of the hybrid scheduler model (setup script + signing). Exact QStash destinations should stay in sync with `docs/QSTASH_SCHEDULER_SETUP.md` and `registered-jobs.ts`.

---

## 4. Registered cron job IDs

From `REGISTERED_CRON_JOBS`:

- `fetch-news`
- `orchestrate`
- `edition-publish`
- `editorial_generate` (Vercel daily backup worker — not a separate QStash schedule for the main path)
- `translation-backfill`
- `cleanup`
- `competitor-tracker`
- `seo-intelligence`
- `serp-tracker`
- `gsc-intelligence`
- `seo-autonomous`
- `workers-health`
- `cluster`
- `revalidate`

---

## 5. Admin surfaces for pipeline ops

| Workspace | Routes | Operator use |
|-----------|--------|--------------|
| Overview | `/admin/overview` | Attention chips for AI backlog / ingestion failures |
| Editorial | `/admin/editorial`, `/admin/stories`, `/admin/live-wire` | Story review & breaking |
| Technical | `/admin/technical`, `/admin/system`, `/admin/ingestion`, `/admin/health`, `/admin/schema` | System health, workers, schema |

Command Centre escalates when:

- AI queue items have errors
- Queue depth &gt; 20 (link to Technical)
- Recent ingestion failures present

---

## 6. Auth for cron endpoints

Cron / worker routes expect platform secrets (e.g. `CRON_SECRET`) and, where applicable, QStash signing verification. Env validation messages in `src/lib/security/env-validation.ts` call out missing `CRON_SECRET` as a production risk. **This audit did not inspect production secret values.**

---

## 7. Translation note

Canonical translation path (from registered-jobs comments):

```text
publish → worker_jobs (translate_article) → job_processor
```

`translation-backfill` enqueues gaps; the Vercel daily/interval cron is a backup drain.

---

## 8. Gaps / external dependencies

- Provider quotas (NewsData, GNews, etc.) can throttle `fetch-news` independently of app code.
- Orchestrate wall-clock limits on Vercel Hobby/Pro affect how much of the AI queue drains per tick.
- Redis (if used for caches/queues) may show degraded health when optional — treat as degraded, not always fatal (prior launch fixes).

---

## 9. Related documents

- `docs/QSTASH_SCHEDULER_SETUP.md`
- `docs/WORKER_ARCHITECTURE.md`
- `docs/INGESTION.md`
- `JANDARPAN_STABILITY_AUDIT.md`
- `JANDARPAN_REMAINING_BLOCKERS.md`
