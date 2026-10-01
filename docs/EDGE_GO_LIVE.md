# Edge pipeline go-live runbook

**End state:** Vercel Hobby = website only · Supabase Free = database + pg_cron + Edge workers · CodeCraft/Gemini/Groq = governed AI generation · no paid infrastructure.

## What runs where

| Work | Where | Cadence | Notes |
|---|---|---|---|
| RSS/NewsData/GNews ingestion | Supabase Edge `fetch-worker` ×10 shards | every 10 min (shard *i* at minute *i*) | ~10 feeds per invocation; API providers only on shard 0 and only if their keys exist |
| Clustering | Edge `cluster-worker` | every 10 min | |
| Editorial generation | Edge `editorial-worker` | wakes every 5 min, **one story per wake** | lease + Redis quota governor + per-run LLM budget + persistent backoff + circuit breaker |
| Translation | Edge `translation-worker` | every 30 min | small batch |
| Retention | Postgres `jd_prune_storage` / `jd_prune_scheduler_logs` | daily 21:40–21:50 UTC | bounded batches, never touches `generated_articles` |
| Website, admin, cache revalidation, orchestrate (images/snapshots), edition-publish, light snapshots | Vercel | orchestrate 15 min; others hourly/daily | Edge workers call `POST /api/cron/revalidate` so the site refreshes |

Scheduling is entirely `pg_cron` -> `jd_invoke_edge` / `jd_invoke_cron` (migrations 089, 090). **`scheduler_control.enabled` is the kill switch** (default `false`).

## Why Redis is mandatory

On Edge every invocation is a fresh isolate, so in-memory quota counters reset on every call and the CodeCraft RPM/TPM/RPD/TPD limits would not be enforced. The editorial worker therefore **refuses to run** (`durable_quota_unavailable`) unless `UPSTASH_REDIS_REST_URL/TOKEN` are configured. There is no bypass.

## Values Vercel keeps write-only (must be supplied)

Put them in the git-ignored `.env.edge-provision.local`:

```
UPSTASH_REDIS_REST_URL=…           UPSTASH_REDIS_REST_TOKEN=…
CODECRAFT_API_KEY=…                CODECRAFT_EDITORIAL_MODEL=…     (CODECRAFT_REPAIR_MODEL, CODECRAFT_BASE_URL optional)
# optional: GNEWS_API_KEY, NEWSDATA_API_KEY (more supply), OPENAI_API_KEY (the translation handler's guard),
#           GEMINI_EDITORIAL_MODEL, GEMINI_LIGHTWEIGHT_MODEL, GEMINI_TRANSLATION_MODEL, GROQ_WRITER_MODEL, GROQ_REVIEW_MODEL, CLOUDFLARE_EMBEDDING_MODEL
```

Gemini / Groq / Cloudflare keys are read from `.env.production.local` (pulled from Vercel).

## Commands

```
node scripts/edge-go-live.mjs plan                  # what is present/missing (names only)
node scripts/edge-go-live.mjs provision --apply     # Redis probe -> Edge secrets -> Vault -> Vercel CRON_SCHEDULER_SECRET (scheduler stays OFF)
# redeploy production so Vercel sees CRON_SCHEDULER_SECRET, then:
node scripts/edge-go-live.mjs preflight             # every worker, Redis atomicity, DB headroom, kill switch still OFF
node scripts/edge-go-live.mjs enable --apply        # only if preflight is green: scheduler_control.enabled = true
node scripts/edge-go-live.mjs observe 12            # watch the first cycle
node scripts/edge-go-live.mjs disable               # instant rollback
```

`pnpm edge:build` builds the four worker bundles (strict, stub-free compatibility audit); `pnpm edge:check` audits only.
Deploy: `supabase functions deploy <name> --no-verify-jwt --use-api` for `editorial-worker`, `fetch-worker`, `cluster-worker`, `translation-worker`.

## After the first healthy cycle (not before)

1. Disable the duplicate GitHub Actions schedules (`ingest.yml`, `workers.yml`, `editorial.yml`, `drain.yml`) — keep `workflow_dispatch`.
2. Remove the duplicate Vercel crons from `vercel.json` that the Edge workers replace.
3. Remediate the backlog **in order**: reject stale queue rows -> classify fresh -> quarantine invalid geography -> reject duplicates -> close orphaned jobs -> repair language mismatches -> hide invalid roundup pages -> backfill geo metadata (`scripts/remediate-pipeline.ts`). Never feed old queue rows to the AI provider.
4. Keep `AUDIO_GENERATION_ENABLED=false`.

## Hosted-runtime facts learned (Supabase Edge 1.76 / Deno 2.1.4-compatible)

`process.env` is read-only (bootstrap installs an overlay) · a `window` global exists on the server (`isBrowserRuntime()` = window AND document) · `process.cpuUsage()`/RSS are stubbed (reported as UNVERIFIED) · CJS dependencies need real `node:` builtins through a prelude (no `require`).

## Legacy editorial schedules (RETIRED)

The Edge pipeline proved a full cycle in production (fetch -> signal -> cluster -> queue -> Edge editorial -> CodeCraft -> gates -> published article, 2026-10-01 18:32 UTC). The two legacy GitHub steps that called `POST /api/cron/editorial-generate` (`workers.yml` Stage C, `editorial.yml` Stage 4) were removed; the Supabase scheduler is the only editorial scheduler. Ingestion, clustering, `ai_enrich`, jobs, publication, health and the image audit workflows are unchanged. `drain.yml` is manual-only and still available for emergencies.

Token budgets: `OPENAI_REPAIR_MAX_TOKENS=3000` and `OPENAI_EDITORIAL_MAX_TOKENS=5000` are provisioned as Edge secrets because the CodeCraft model spends hidden reasoning tokens (the default 500-token repair budget returned an empty response).
