# Jandarpan pipeline reliability — findings, changes, rollout

Branch `feat/jandarpan-pipeline-reliability` (from `origin/main`). Everything here was measured against the live
Supabase project `giiuqshoconjbpiueasp` (read-only) on **2026-09-29/30 (IST)**. Nothing in this document has been applied to
production yet — see “Rollout”.

## 1. Root causes (verified, not assumed)

| # | Finding | Evidence |
|---|---|---|
| 1 | **The scheduler cannot deliver the cadence.** Production ran on GitHub Actions `schedule:` (throttled) and Vercel Hobby (daily max). | 24h of `ops_cron_runs`: fetch-news 14 runs, editorial-generate 9, cluster 9 — in bursts every 3–7h. Required: 144 / 288 / 144. |
| 2 | **Overlap protection was hard-disabled** (`return true; // bypass lock`). A faster cadence would have generated duplicates. | `run-guard.ts` |
| 3 | **AI providers burned 60–90 s per article on dead providers.** CodeCraft `deepseek-v4-pro-max` → 401 after ~87 s; the DeepSeek model id was also forwarded to Gemini (accepted because it contains “pro”) and Groq, which 404. Provider health was in-memory (lost every cold start), 10 s cooldown, timeouts retried. | `ai_provider_usage_events` 48h |
| 4 | **Half of all supply was discarded before generation by a media gate.** | 536 of 993 signals (54%) failed `isEditoriallyEligibleSourceImageUrl` (ingestion fills missing photos with Unsplash stock). 0 published stories in 30 days lacked an image. |
| 5 | **1,005 of 1,009 fresh events have no article.** 4 published in the last 24 h, 0 in the last 3 h. | dashboard funnel |
| 6 | **Legacy queues are orphaned.** `news_ai_queue`: 6,194 pending, 89% >48 h old, nothing consuming since 2026-09-19; `worker_jobs(editorial_generate)`: 95 pending that no code claims. | queue queries |
| 7 | **Language corruption.** 11 of 35 `en` articles have Devanagari headlines. `detectLanguage` counted at most one Devanagari match. | `script-detect` calibrated on all 93 live rows: 12/12 hits, 0/81 false positives |
| 8 | **False district attribution + junk in the live feed.** 3 articles tagged to the wrong district; 12 of 87 published headlines are dated “live update” roundup pages. | classifier vs stored geo |
| 9 | **Read path shipped 2.6 MB of JSON per homepage build**, and functions ran in `iad1` against a Tokyo database. Query execution itself is 1 ms. | `EXPLAIN ANALYZE` as `anon`; Vercel project config |
| 10 | **Static fallback pool (47 hard-coded articles, Sep 23–25) was merged into Latest and district feeds**; ranking let a 3-day-old story outrank a 1-hour-old one. | `latest/page.tsx`, `quality-score.ts` |
| 11 | Every ingest run finished `partial_timeout` (52 s budget on a 300 s route); source “health” labels never decay (feeds with no success in 9 days, or no new item since July, reported healthy). | `ingestion_logs`, `ingestion_source_state` |
| 12 | `orchestrate` recorded `ok=false` for healthy-but-idle runs (8 of 12). | `orchestrator.ts:283` |
| 13 | Config typo: Vercel var `NEWSROOM_EDITORIAL_LANGUAG` (code reads `…LANGUAGE`), so the forced-language setting never applies. | `vercel env ls` |
| 14 | RLS: `story_likes_manage_public` allows anon `ALL` with `using (true)` (anyone can insert/delete likes for any user id); `/api/broadcast/tts` was an open GET turning arbitrary text into paid audio. | migration 078; route |

## 2. What changed

**Scheduling & reliability** — `scheduler-manifest.ts` + migration 083 (pg_cron/pg_net, 16 jobs, Vault credentials, dispatch log);
DB run leases (082) replacing the disabled lock; `CRON_SCHEDULER_SECRET`; ingest budget 190 s; `ops_cron_runs` now stores
processed/skipped/failed/metadata/trigger/run id (085); `orchestrate` `ok` fixed. See `docs/SUPABASE_SCHEDULER.md`.

**AI providers** — per-provider model scoping (a foreign model override is dropped); persisted circuit breaker
(`ai_provider_circuit`, 081) with cooldown by failure class (model-unavailable 6 h, auth 30 m, rate-limit 1→15 m, transient 2→30 m);
per-provider timeout caps; timeouts fail over instead of retrying; no built-in CodeCraft default model; real model recorded in the
audit trail. Order stays codecraft → gemini → groq; failover is health-aware and shared by every serverless instance.

**Queue** — `news_ai_queue` states `pending|processing|completed|failed|dead|quarantined|rejected_stale|rejected_duplicate|rejected_geo|rejected_quality`,
attempts, exponential backoff, leases, dead-lettering after 5, freshest-first claim, automatic stale sweep (082).

**Publication gates** (before anything publishes) — deterministic geo scope (`DISTRICT_SPECIFIC | STATEWIDE_CHHATTISGARH | INDIA_RELEVANT_TO_CHHATTISGARH | NATIONAL | INTERNATIONAL | UNKNOWN`)
from textual evidence only (never a feed hint or event guess; same-name places in other states are not CG districts); language-script
validation; headline quality (generic boilerplate, dated roundups, placeholders, duplicates). Failures feed the repair loop with plain-language
fixes; `UNKNOWN` geography is quarantined as a pending draft; the breaking-news override can no longer bypass the gates;
`publishGeneratedArticle` refuses gated drafts without an editor override. **Publication no longer depends on images.**

**Dedupe** — cross-language duplicate detection with multilingual embeddings (088), `off | shadow | enforce`, default **shadow**.

**Feeds** — one selector decides scope and order. District feeds admit only stories with evidence for that district and never
backfill; Latest is strict `published_at` desc; Home orders by freshness class first (<1 h, 1–3 h, 3–6 h, 6–12 h, 12–24 h, 1–2 d, older);
the India-relevant share is capped at 20%; static fallback removed from live feeds; publish revalidates `/latest` and `/district`.

**Performance** — slim feed view (`generated_articles_feed`, 084: −66% metadata JSON), homepage pool 300→140, functions in
`hnd1` (next to the Tokyo database), root-layout waterfall parallelised, Devanagari font preloaded. No new indexes: `EXPLAIN ANALYZE` showed the
existing ones are used and execution is ~1 ms on this table (indexes should be revisited when it holds tens of thousands of rows).

**Sources** — derived health (healthy/degraded/dormant/rate-limited/failing/disabled/retired/orphaned) and adaptive polling
(20 m → 1 h → 3 h → 6 h for feeds returning only duplicates; 12 h when dormant; direct CG publishers never beyond 30 m).

**Admin control center** (`/admin/overview`) — one service-role RPC (`admin_ops_snapshot`, 086) computes every number from real
tables: users and active users, pace vs the 100/day target with stall detection, freshness lag, ingestion, funnel (1 h/today/24 h),
sources (click to expand), geo coverage by district, language health, queue & failure center (click a category → underlying
jobs/articles), article performance (real articles only; 24 h / 7 d / all-time windows labelled), AI provider health, scheduled jobs,
12-subsystem health, secure searchable/sortable/paginated user table (server-side only), voice panel, and **Run now** controls (audited,
rate-limited, overlap-locked, return a run id).

**Voice** — Google Gemini-TTS primary, Chirp 3 HD fallback, server-side only, service-account auth from env; broadcast script
transformer (junk stripping, abbreviations, lakh/crore words, dates/times/currency, sentence shaping, headline read once,
radio/tv/short-bulletin budgets, 8 delivery styles); `article_audio` table with uniqueness per voice configuration and a private
bucket with signed-URL playback; MP3 frame-level validation; failure never touches publication.

## 3. Rollout (in this order; each step is reversible)

Only steps marked ⚠ change production. Do not skip the verification after each.

1. **Review & merge** the PR. Vercel deploys. The new code tolerates unapplied migrations (feed view falls back to the table,
   dashboard shows “apply migration 086”, circuit persistence swallows missing-table errors).
2. ⚠ **Apply migrations 081 → 088** (`pnpm supabase:push`). All were dry-run inside rolled-back transactions against the live schema;
   `083` only registers schedules — with no Vault secrets yet every dispatch is a logged no-op.
3. ⚠ **Backlog remediation**: `pnpm exec tsx scripts/remediate-pipeline.ts` (plan; nothing written) → review → `--apply`.
   Real plan numbers: 5,529 stale queue rows → `rejected_stale`; 665 fresh: 292 `rejected_geo`, 251 `quarantined`, 2 duplicates (≈120 remain valid);
   95 orphan jobs closed; 11 language relabels; **12 live roundup pages hidden**; 87 geo backfills.
4. ⚠ **Scheduler**: `scripts/setup-supabase-scheduler.ts --apply`, redeploy, verify (see the scheduler doc).
5. ⚠ **Vercel env**: fix `NEWSROOM_EDITORIAL_LANGUAG` → `NEWSROOM_EDITORIAL_LANGUAGE` (decide the intended value); set/verify
   `CODECRAFT_EDITORIAL_MODEL` to a model the gateway serves (or remove the CodeCraft key so gemini→groq lead).
6. ⚠ **Voice**: create a service account in the credit-bearing GCP project (role *Cloud Text-to-Speech API User*), enable the Cloud
   Text-to-Speech API, set `GOOGLE_TTS_SERVICE_ACCOUNT_JSON` (sensitive) + `GOOGLE_CLOUD_PROJECT`; run
   `pnpm exec tsx scripts/voice-smoke-test.ts` **and listen** to the four MP3s before enabling.
7. **Cross-language dedupe**: leave in `shadow`; after a few days review `story_language_links` similarity distribution, set thresholds, then `enforce`.

Rollback: `select cron.unschedule(jobid) from cron.job where jobname like 'jd-%';` stops the scheduler; every code change is a normal revert;
migrations are additive (new tables/columns/functions; the two replaced functions keep their signatures).

## 4. Acceptance status

| Criterion | Status |
|---|---|
| A fresh news arriving automatically | Code + scheduler ready; **needs rollout step 4** |
| B ≥100 eligible/day throughput | Removes the 3 measured blockers (scheduler cadence, provider waste, media gate). **CG-only supply is ~70 signals/day**, so 100/day needs national/international sections — see risks. Verify after rollout. |
| C/D old stories not latest; Latest chronological | Done + tested |
| E/F district isolation; no false districts | Done + tested; legacy rows re-derived from text |
| G/H language separation; cross-language link | Gates done; dedupe in shadow (thresholds need real data) |
| I generic headlines blocked | Done; 12 live ones found |
| J provider failover | Done + tested |
| K queue measurable & declining | Measurable now; declining after step 3 |
| L feed timeouts | Payload −66%, region co-located; **measure after deploy** |
| N–Q admin | Done; rendered and screenshot-verified against the real snapshot |
| R–S voice on Google | Implemented + unit-tested with mocked Google; **not exercised against Google, not listened to** |
| T failures observable | Done |

## 5. Remaining risks / open decisions

* **Supply, not just plumbing.** Only ~136 of 993 signals/48 h are Chhattisgarh-relevant (75% carry no geographic evidence). Reaching
  100 eligible stories/day means publishing NATIONAL/INTERNATIONAL stories in dedicated sections (they are now classified and excluded from
  district/CG feeds, but no national section UI exists), and/or adding direct CG publisher feeds.
* **Voice quality is unverified.** No Google credentials here; nobody has listened. Model/voice names (`gemini-2.5-flash-tts`, `Charon`/`Kore`,
  `*-Chirp3-HD-*`) are env-tunable. Pronunciation, pauses and naturalness need a human ear.
* **Cross-language thresholds (0.82 / 0.88) are unvalidated** — hence shadow mode.
* `cookies()` in the root layout makes every page dynamic, so `revalidate = 60` on pages is largely moot; making the shell static is a larger refactor not attempted.
* RLS on `story_likes` / `story_comments` is permissive (anon can write any `user_id`); engagement numbers are therefore spoofable. Needs a server-mediated write path.
* Google-News search feeds (`gnews-cg-*`) return ~100 already-seen items per poll; adaptive polling reduces cost but they remain low-yield.
* Vercel Hobby: 300 s functions and `regions` may be plan-limited; confirm the deployment accepts `hnd1`.

## 6. Environment variables introduced or changed

`.env.example` is git-ignored in this repo (`.env*`), so the reference lives here. **Secrets are never committed; set them as
sensitive Vercel variables.**

| Variable | Where | Purpose |
|---|---|---|
| `CRON_SCHEDULER_SECRET` | Vercel (sensitive) **and** Supabase Vault as `jd_cron_secret` | Dedicated pg_cron credential: ingest/pipeline/ops routes only, never admin. Set by `scripts/setup-supabase-scheduler.ts`. |
| `jd_app_base_url` | Supabase Vault | Production base URL the dispatcher calls (`https://www.jandarpan.news`). |
| `GOOGLE_TTS_SERVICE_ACCOUNT_JSON` | Vercel (sensitive) | Service-account key JSON (raw or base64) for the GCP project carrying the credit/billing account. Role: *Cloud Text-to-Speech API User* only. |
| `GOOGLE_CLOUD_PROJECT` | Vercel | Billing project id (sent as `x-goog-user-project`). |
| `GOOGLE_TTS_GEMINI_MODEL` | Vercel | Default `gemini-2.5-flash-tts`. |
| `TTS_PRIMARY` | Vercel | `gemini_tts` (default) or `chirp3_hd`. |
| `VOICE_GEMINI_{HI,EN}_{STANDARD,URGENT}` / `VOICE_CHIRP_…` | Vercel | Voice overrides (defaults Charon/Kore and `*-Chirp3-HD-{Charon,Kore}`). |
| `AUDIO_BATCH_LIMIT` | Vercel | Audio jobs per 10-minute run (default 4). |
| `TTS_COST_CHIRP3_PER_M_CHARS`, `TTS_COST_GEMINI_{IN,OUT}_PER_M_TOKENS` | Vercel | Cost-estimate constants shown on the dashboard. |
| `CODECRAFT_EDITORIAL_MODEL`, `CODECRAFT_REPAIR_MODEL` | Vercel | **Must be a model your gateway serves.** There is no built-in default any more; CodeCraft is skipped unless key **and** model are set. |
| `AI_PROVIDER_TIMEOUT_CAP_MS_<PROVIDER>` | Vercel | Per-attempt timeout cap (defaults: codecraft 60 s, gemini 40 s, groq 30 s). |
| `AI_CIRCUIT_PERSIST=off` | tests/local | Disable DB-persisted circuit state. |
| `CROSS_LANG_DEDUPE_MODE` | Vercel | `off` \| `shadow` (default) \| `enforce`. |
| `CROSS_LANG_SIM_THRESHOLD`, `SAME_LANG_SIM_THRESHOLD` | Vercel | 0.82 / 0.88 defaults — calibrate from `story_language_links`. |
| `DAILY_PUBLISH_TARGET` | Vercel | Dashboard pace target (default 100). |
| `HOMEPAGE_POOL_LIMIT` | Vercel | Rows loaded for the homepage build (60–300, default 140). |
| `INGEST_BUDGET_MS` | Vercel | Ingest soft-stop budget (default now 190000). |
| `NEXT_PUBLIC_ADMIN_OPS_POLL_MS` | Vercel | Dashboard refresh interval (default 60000). |
| `NEWSROOM_EDITORIAL_LANGUAG` → `NEWSROOM_EDITORIAL_LANGUAGE` | Vercel | **Rename** (the name on Vercel is truncated; the code reads the full name). Decide the intended value (`hi` or `en`). |
