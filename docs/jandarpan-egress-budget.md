# Jan Darpan — Supabase egress: measurements, model, controls and recovery

Constraint: ₹0 additional platform cost. No upgrade, no spend-cap change, no second project, no quota bypass.
State when written (2026-10-02): Supabase returns `402 exceed_egress_quota` on REST and Edge Functions; direct SQL works.
Scheduler OFF (`scheduler_control.enabled = false`), `JD_PAUSE_RECURRING=true` on Vercel, three GitHub schedules disabled.
**The billing-cycle reset date is NOT known and nothing here assumes one.** Every figure below is reproducible with
`node scripts/egress-model.mjs`.

## 1. Conventions (read first)

| Term | Exact meaning |
|---|---|
| **bytes** | decoded UTF-8 bytes of the JSON PostgREST returns for a call: `octet_length(to_json(row)::text)` summed over rows (array brackets/commas ignored, ≤ 2 B/row). Hindi text counts 3 B/char. **Not** the compressed bytes on the wire and **not** a billed number. |
| **KB / MB / GB** | decimal: 1 KB = 1,000 B, 1 MB = 10⁶ B, 1 GB = 10⁹ B everywhere in this document. |
| **"5 GB"** | the Free-plan egress figure this project assumed. The dashboard decides what is billed (compressed or not, cached vs uncached). Unverified. |
| **[M]** | measured: an exact query on production on the stated date (queries listed in §3). |
| **[A]** | assumption / model input: not observed; stated so it can be challenged. |
| **window** | the period a number covers. Historical numbers cover the `pg_stat_statements` window **2026-09-18 19:10:13Z → 2026-10-02 10:02:33Z = 13.6197 days**. Forward numbers are per 30 days. |

## 2. What was wrong with the previous version of this document

| # | Defect | Effect | Fixed by |
|---|---|---|---|
| 1 | Per-call sizes were measured on today's 94–100 article rows but applied to the whole 13.6-day window, when the table grew from **1 row (Sep 18) to 100 (Oct 1)**; mean rows over the window are **51.8 created / 46.6 published**. | historical total overstated ≈ 2× | §4 reports both bounds |
| 2 | One size (1.53 MB, the *with-translations* shape) was used for the 16,222-call list statement, which **has no `translations` column** (12,992 B/row). | that line overstated 1.2× | §3 gives each statement its own size |
| 3 | Event-bundle reads (15,313 calls) were charged ~30 KB each, but a bundle returns an article row only when the event has one — **1.36 %** of events do. | ~0.45 GB claimed vs 0.003–0.22 GB | §4, S7 |
| 4 | Units mixed: historical table in decimal MB/GB, forward scenarios in KiB/GiB. | ±7 % inconsistency | §1 (decimal everywhere) |
| 5 | The 5,773-call statement was labelled "broadcast feed". It is a list read of the base table **with** `translations`; the caller is not identifiable from the statistics. | wrong attribution | relabelled S2 |
| 6 | The historical total (~50 GB/14 days) was never reconciled with a 5 GB quota that was first exceeded on Oct 1; the forward scenarios (3.9–4.7 GB/month) looked unrelated to it. | confusing | §4.3 states the gap openly |
| 7 | Per-run constants for the fetch worker, bundle reads and "misc" were presented next to measured numbers without a tag. | modeled values looked measured | every input tagged [M]/[A] |
| 8 | "Both Vercel crons are paused" was wrong: `/api/admin/audit-branded-images` is an admin route and was not covered by the guard. | one daily call unpaused | fixed in this change (§7) |

## 3. Measured data

**Statement statistics** (`pg_stat_statements`, window above; `calls` exact; `rows` = 1 per call because PostgREST wraps results in one JSON row, so bytes cannot be read from the statistics):

| id | queryid | calls [M] | columns (table) | bytes/row [M] | rows [M on 100-row table] |
|---|---|---|---|---|---|
| S1 | 1830646802541169802 | 16,222 | list columns incl. full `editorial_metadata`, **no** `translations` (`generated_articles`) | 12,992 | 94 published |
| S2 | 860305321830660239 | 5,773 | S1 columns **+ `translations`** | 15,629 | 94 |
| S3 | 7842119391319776054 | 4,671 | list columns + `article_body`, `geo_metadata` | 15,058 | 94 |
| S4 | -5694815575629796835 | 8,447 | `slug, published_at, editorial_metadata, geo_metadata, created_at` (14 d, ≤ 800) | 11,391 | 100 |
| S5 | 6224009728020304599 | 4,243 | `tags, editorial_metadata` (≤ 400) | 10,927 | 100 |
| S6 | 8760062115813872072 | 1,448 | `generated_articles_feed` view (translations incl. bodies) | 6,168 | 100 |
| S7 | -7741234633167149992 | 15,313 | article by `event_id` (event bundle) | 14,510 | returns a row for 1.36 % of events |

**Table size history** [M] (`count(*) from generated_articles where created_at < day+1`, end of day): Sep 18: 1, 19: 6, 20: 8, 21: 8, 22: 26, 23: 39, 24: 47, 25: 56, 26: 87, 27: 88, 28: 89, 29: 94, 30: 94, Oct 1: 100 (published: 0, 1, 3, 3, 21, 34, 42, 51, 81, 82, 83, 88, 88, 94).

**Other measured sizes** (bytes/row or bytes/call, 2026-10-02): list-card view after migration 098 **3,674 B/row** (before: 4,588); `generated_articles_feed_full` 6,168; district lean row 50; topic row 142; unclustered-signal RPC row 1,401; cluster matcher event row 993; candidate slate 72,169 B (41 rows today); story-index row 498 (+24 B fingerprint after backfill); source-state full row 760 / poll-columns row 443; source-health row 270; event row for a bundle 2,094; Storage 3 MB total (51 objects, nothing since July); reader traffic ≤ 33 sessions/day (`reader_analytics_events`, Sep 19–25).

## 4. Historical reconstruction (before the fixes)

### 4.1 Formula
`bytes(Si) = calls(Si) × rows_per_call × bytes_per_row(Si)` over the window; `rows_per_call = min(LIMIT, rows that existed)`. LIMIT values are not recorded in the statistics but every list caller used ≥ 80 and the table held < 80 rows until Sep 26, so `rows_per_call` = rows that existed.
* **upper bound**: rows = today's rows (94 published / 100 created).
* **central estimate**: rows = window mean (46.6 published / 51.8 created). **[A]** calls were spread uniformly over the window.

### 4.2 Result (decimal GB over the 13.62-day window)
| id | calls | B/row | upper | central |
|---|---|---|---|---|
| S1 | 16,222 | 12,992 | 19.81 | 9.83 |
| S2 | 5,773 | 15,629 | 8.48 | 4.21 |
| S3 | 4,671 | 15,058 | 6.61 | 3.28 |
| S4 | 8,447 | 11,391 | 9.62 | 4.98 |
| S5 | 4,243 | 10,927 | 4.64 | 2.40 |
| S6 | 1,448 | 6,168 | 0.84 | 0.42 |
| S7 | 15,313 | 14,510 × 1.36 % | 0.003 (0.22 if every call returned an article) | — |
| **S1–S6** | | | **50.00 GB** | **25.12 GB** (≈ 55 GB per 30 days) |

### 4.3 Reconciliation with the quota — open
Even the central estimate (25 GB decoded in 13.6 days) is ~5× a 5 GB allowance that was first exceeded on Oct 1. The data cannot settle why. Candidate explanations, **none verified**: (a) the billing cycle started mid-window, so only part of these calls count toward the current cycle; (b) bytes are billed compressed (JSON compresses several-fold); (c) the call distribution was skewed toward the small-table days; (d) some of these statements are `HEAD`/count requests that return no body; (e) the allowance is not 5 GB. The **ranking** of contributors is robust to all of these (it depends only on calls × bytes/row), the **absolute** totals are not. Owner action: read the billing period, egress (unified/cached/uncached) and per-service split from the Supabase dashboard and add them here.

## 5. Forward model (per 30 days, decoded bytes)
Produced by `scripts/egress-model.mjs`. Inputs tagged in the script; the main ones: fetch run ≈ 21 KB (= 4.8 sources × (443 + 270) B gating [M×A] + 4.8 × 760 B full state + 30 % × 4.8 × 760 B CAS read [A] + 10 KB URL dedupe + 2.5 KB persist/queue [A]); cluster run = rows × 1,401 B [M] + 100 × 993 B [M] + 10 KB merges [A]; editorial wake = 72 KB slate [M] + 25 KB × busy-share [A]; story index = DB read only after a publish (Redis otherwise) = publishes/day × 150 × 522 B; list pool refreshes/day = min(48, 24 + stories/day) [A: 60-min TTL backstop, purges debounced to 30 min] × 160 × 3,674 B [M×extrapolated]; broadcast pool 24/day × 60 × 6,168 B; hub counts 24/day × (800 × 50 + 400 × 142) B at the row caps; bundles 1,124/day [M: 15,313 calls / 13.62 d] × (2,094 + 2 × 2,500 [A] + 1.36 % × 14,510) B; story pages and admin/auth/storage are [A] placeholders.

| Scenario | Workers | Site | Total | % of 5 GB | if 3× / 4× compressed [A] |
|---|---|---|---|---|---|
| A. current supply (~10 stories/day, ~600 signals/day), editorial every 5 min | 2.14 GB | 1.39 GB | **3.53 GB** | 71 % | 1.18 / 0.88 GB |
| B. 100 stories/day, four-district-first (~1,000 signals/day), editorial every 5 min | 2.58 GB | 1.88 GB | **4.46 GB** | 89 % | 1.49 / 1.12 GB |
| C. as B, editorial every 10 min | 2.20 GB | 1.88 GB | **4.07 GB** | 81 % | 1.36 / 1.02 GB |

**Reading:** on a decoded-bytes basis scenario B sits at 89 % of 5 GB — not "comfortably below". It is comfortable only if the platform bills compressed bytes. These totals are model outputs, not observations; the egress meter (§6) exists to replace them with measurements within hours of resuming.

## 6. Controls now in the code (verified against merged `origin/main` and the deployed bundles)

| Control | Where | Verified |
|---|---|---|
| Shared 160-row list pool (one cached read, prefix-sliced) | `newsroom/generated/read.ts` `LIST_POOL_ROWS` | source @ f4781d33; Vercel prod deployment from that commit |
| 60-row broadcast pool, 1 h | `read.ts` `BODIES_POOL_ROWS`, `api/broadcast/feed/route.ts` | same |
| Hub counts cached 1 h, lean reads | `platform-admin/districts.ts`, `topics.ts` | same + this change (two-query lean read, 50 B/row) |
| No post-ingest snapshot refresh from Edge shards; list projection | `news/pipeline/scalable-ingest.ts`, `news/live-feed/resolve-pool.ts` | same |
| Publish purge ≤ 1 per 30 min, fails toward fewer reads | `infrastructure/cache/purge-gate.ts`, `edge/editorial-worker/deps.ts` | Edge bundle contains `jd:site-purge-gate` |
| Fetch shards read only their own source state; one full state read per source; no echo on upsert | `news/providers/rss-batch.ts`, `rss.ts`, `ingestion/source-state.ts` | Edge bundle contains `forPollGating` |
| Candidate slate 44 rows | migration 097 | function defaults 25/10/6/3 confirmed in production |
| Story index: Redis copy (10 min, deleted on persist), DB read only after a publish; 150 rows; read after the candidate pool | `news/ai/story-index-cache.ts`, `generate-article.ts` | this change |
| Slimmer list-card view (−20 %: no `seo_title`, `translations` = headline/summary/reading_time) | migration 098 | measured 3,674 vs 4,588 B/row in a rolled-back transaction |
| Browser refresh 5 min, visible tabs only | `HomeLiveRefresh.tsx`, `LiveDeskRefresh.tsx` | source @ f4781d33 |
| Single-flight cache loads (no duplicate refreshes) | `shared-read-cache.ts` | tests |
| Legacy intelligence snapshot **off by default** (`INTELLIGENCE_SNAPSHOT_ENABLED=true` to enable): not enqueued, queued jobs no-op | `infrastructure/config.ts`, `events/event-bus.ts`, `jobs/handlers.ts` | tests. *Before this change it was only inert while the scheduler was OFF.* |
| Live pages/sitemap only for genuinely live, canonical events (superseded duplicates excluded; 137 were live) | `news/coverage/read.ts`, `fetch-event-bundle.ts` | this change |
| Egress meter (`JD_EGRESS_METER=true`, Edge secret set) | `observability/egress-meter.ts`, `supabase/admin.ts`, worker kit | all four bundles contain it; **not exercised at runtime (402)** |
| **Egress governor** (off by default) | `observability/egress-governor.ts`, worker kit/handler | tests; zero Redis traffic while off |
| Admin diagnostics | `GET /api/admin/ops/egress` | tests; no Supabase request |

### Governor configuration (all optional; unset = no effect)
`JD_EGRESS_GOVERNOR` = `off` (default) | `observe` (report only) | `enforce` (block at stop); `JD_EGRESS_MONTHLY_BUDGET_BYTES` (5,000,000,000); `JD_EGRESS_SITE_RESERVE_BYTES` (1,500,000,000, held back for readers — not metered by the workers); `JD_EGRESS_WARN_RATIO` / `JD_EGRESS_STOP_RATIO` (0.60 / 0.80 of budget − reserve → warn at 2.1 GB, stop at 2.8 GB of worker egress); `JD_EGRESS_CYCLE_ANCHOR_DAY` (1–28; **default 1 is a placeholder** — set it from the dashboard's billing period). Durable counter: Redis key `jd:egress:cycle:<cycle-start-date>`, one per cycle (a new cycle starts at zero automatically), incremented once per run, TTL 45 days. Enforce fails closed: meter off, Redis missing/unreadable, or invalid config ⇒ stop. It only ever skips scheduler-triggered work; it never retries or routes around a restriction. Redis cost when enabled ≈ 2 commands per worker run (≈ 3.8 K/day) plus ≈ 0.5 K/day for the story-index and purge gate — keep the Upstash free-plan limits in view.

## 7. Pause state (corrected)
| Layer | State |
|---|---|
| pg_cron (22 jobs) | inert: `jd_invoke_*` return before reading a secret or calling `net.http_*` (verified by a static contract test and 0 pg_net responses since 23:12:51Z Oct 1) |
| GitHub Actions | Ingest News, Enterprise Workers, Editorial Orchestration **disabled**; Drain / Step4 manual-only |
| Vercel Crons | `/api/cron/orchestrate` paused by `JD_PAUSE_RECURRING`; `/api/admin/audit-branded-images` **now** paused for scheduler callers (Vercel Cron user-agent or a Bearer/`x-cron-secret` caller) but not for a signed-in human admin; test asserts every path in `vercel.json` is paused |
| Kept alive on purpose | `/api/cron/revalidate` (publish purge; no Supabase read) so list pages stay fresh when only the Edge pipeline runs |

## 8. Remaining egress risks (ranked)
1. **Absolute level unknown** until the dashboard figures and the first meter readings exist (§4.3). Scenario B is 89 % raw.
2. List pool: ~590 KB per refresh × up to 48/day is the largest single site item; the cheapest further cut is fewer refreshes (longer purge debounce) or fewer rows.
3. Fetch workers: 1,440 runs/day, ~21 KB each (URL-dedupe lookups are the biggest part and are modeled).
4. Editorial slate: 72 KB per wake; a Redis copy is not safe (it changes every wake) — reduce wake frequency instead.
5. Legacy jobs that remain enqueueable on resume (`event_cluster`, `embed_*`, `seo_analysis`, `analytics_aggregate`, `dam_analyze`): they run only via `/api/cron/jobs`, which stays paused while `JD_PAUSE_RECURRING=true`; do not remove that variable when resuming the Edge pipeline.
6. Event/live and story pages are crawled constantly; 5-minute bundle cache and the lean selects bound them but crawler volume is unobserved.
7. The governor covers workers only; readers are a fixed reserve, not a measurement.

## 9. Recovery (one probe, then verify before enabling) — unchanged in order
1. Owner records the dashboard numbers (§4.3) and sets `JD_EGRESS_CYCLE_ANCHOR_DAY`.
2. `node scripts/supabase-recovery-check.mjs` — one REST request, 6-hour guard, enables nothing.
3. HTTP 200 → `node scripts/edge-go-live.mjs preflight` (must be fully green) → verify fetch, cluster (no signal owned by two events), editorial dry-run, Redis TTLs, one CodeCraft request.
4. Set `JD_EGRESS_GOVERNOR=observe`, keep `JD_PAUSE_RECURRING=true`, editorial every 10 minutes for week one; then `enable --apply` and `observe 12`.
5. After 24–48 h compare `metadata.egress` (per run, by table) with the dashboard, correct §5, and only then consider `enforce` and higher volume.
