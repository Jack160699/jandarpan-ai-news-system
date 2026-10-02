# Jan Darpan — Supabase egress budget, pause state and recovery (2026-10-02)

Constraint: ₹0 additional platform cost. No plan upgrade, no spend-cap change, no second project, no quota bypass.
State: Supabase returns `402 exceed_egress_quota` on REST and Edge Functions. Direct SQL (CLI/Management API) still works.

## 1. What is paused (and what is not)

| Layer | Recurring traffic | State |
|---|---|---|
| Supabase scheduler | 22 active pg_cron jobs (fetch ×10 shards, cluster, editorial, translation, orchestrate, cron-jobs, district-coverage, edition-publish, daily report, quota snapshot, verified-rates, prunes) | `scheduler_control.enabled = false`. Every `jd_invoke_edge` / `jd_invoke_cron` returns immediately: verified 0 pg_net requests since 23:12:51 UTC 2026-10-01. The jobs still *fire* (pure local SQL, no network, no egress); leaving them keeps recovery a single switch. |
| GitHub Actions | **Ingest News** (every 30 min), **Enterprise Workers** (every 30 min + 2 daily bursts), **Editorial Orchestration** (2 daily) | **Disabled** (`gh workflow disable`; re-enable with `gh workflow enable <id>` — they are legacy and should stay retired). They were still running and calling the site's cron routes. `Drain` and `Step4 Ops Probe` are manual-only and untouched. |
| Vercel Crons | `/api/cron/orchestrate` daily, `/api/admin/audit-branded-images` daily | Paused by `JD_PAUSE_RECURRING=true` (proxy answers every `/api/cron/*`, `/api/fetch-news`, `/api/process-ai`, `/api/generate-articles`, `/api/process-editorial-images` with a static 200 before any route runs). Also covers any QStash schedule (cannot be listed: no QSTASH_TOKEN). |
| Website, auth, admin, `/api/health*`, `/api/rss-health`, `/api/status/production`, dashboard/CLI DB access | — | **Not paused.** |

Not paused and unavoidable: reader/crawler page loads (each is one cached read once recovered; while restricted they fail fast with a small 402 body).

## 2. Billing-cycle reset — NOT determinable from the CLI/API surface available here
Nothing I am allowed to read exposes the billing period, unified/cached/uncached egress, or per-service breakdown (no access token is available to this session; I did not extract the CLI's stored credential). What is verifiable:
* Project `newspaper-motion` created **2026-05-21 17:27 UTC**; status `ACTIVE_HEALTHY` (the restriction is billing-level, not a health state). Organization `Kairela and Archive`.
* The 402 body names only `exceed_egress_quota`; it carries no date.
* Hypothesis, **unverified**: if the cycle anchors to the project/subscription day, it resets on the 21st (→ 2026-10-21). A calendar-month reset is unlikely: the restriction began at 22:47 UTC on Oct 1, hours after a calendar reset would have refilled the quota.
**Owner action (1 minute):** Supabase Dashboard → Organization `Kairela and Archive` → Usage (or Billing). Record: billing period start/end, "Egress" (unified), cached vs uncached, and the per-service split (Database/REST, Edge Functions, Storage, Auth, Realtime). Paste the numbers into the table in §4 to calibrate the model.

## 3. Where the egress actually went (14 days, `pg_stat_statements` since 2026-09-18)
Call counts are exact; bytes per call are measured on production rows today (UTF-8 `octet_length`, Hindi = 3 B/char) at the current 100-article table, so totals are an UPPER BOUND (the table was smaller earlier; responses are compressed in transit by an unknown factor).

| # | Read | Calls (14 d) | Bytes/call (raw) | Modeled raw | Cause |
|---|---|---|---|---|---|
| 1 | List pool, base table, full translations (home/district/category/latest/search/feeds) | 16,222 | 1.53 MB | ~25 GB | uncached; `translations` carried full translated bodies; a 60 s re-render timer per open tab; cache purged after every ingest |
| 2 | District hub counts (`/districts/*`, sitemap, heatmap) | 8,447 | 1.14 MB | ~9.6 GB | read up to 800 whole articles (editorial_metadata ≈ 9 KB each) to compute a COUNT, on every request |
| 3 | Full-body pool snapshot (`refreshSnapshotFromDatabase`, default select) | 4,671 | ~1.4 MB | ~6.5 GB | ran after every ingest run that inserted a signal |
| 4 | Topic hub counts (`/topics/*`, sitemap) | 4,243 | 1.09 MB | ~4.6 GB | same pattern as #2 |
| 5 | Broadcast feed (2 × 300-row reads with bodies per request) | ~5,800 | 0.6–1.8 MB | ~3.6+ GB | duplicate reads, uncached |
| 6 | Cluster run (unclustered `select *` ×240 + capped id lookup + matcher pool) | ~700 | 622 KB | ~0.4 GB | the duplicate-event loop (migration 092) |
| 7 | Event/live page bundles | 15,313 | ~30 KB | ~0.45 GB | crawler re-reads |
Storage is not a factor (3 MB, 51 objects, nothing new since July). Reader traffic is tiny (≤ 33 sessions/day); the load was server-side re-reading.

## 4. What changed (all merged, behaviour-preserving)
* Shared read cache (`shared-read-cache.ts`): Next Data Cache + per-process memo; failed loads never cached; Edge workers use a pass-through.
* List pool: one cached 160-row read shared by every list page (was one uncached read per request, 6 sizes); broadcast pool 60 rows / 1 h; empty/failed/fallback results never cached.
* Feed view no longer ships translated bodies (migration 093, −59% translations, row 15.3 KB → 4.6 KB incl. UTF-8).
* District/topic counts: JSON-path projection (11.4 KB → 1.4 KB/row; 10.9 KB → 0.14 KB/row), cached 1 h.
* Snapshot refresh: list projection, never from Edge shards, never on signal insert; orchestrator purges only on publish.
* Fetch shards: health/state read only for the shard's own ~6 sources with the poll-gating columns (62 KB → ~4 KB per run); no cache purge on signal insertion.
* Editorial worker: tiered candidate slate in SQL (146 KB → 72 KB, migration 097); story index = persisted fingerprints, 150 rows (was 500 full bodies ≈ 268 KB → ~75 KB) and only read when there is a candidate; purge on publish, debounced to 1 per 30 min (Redis gate).
* Cluster: matcher pool 100 events, no ids/metadata; unclustered RPC with bounded text; event bundles cached 5 min.
* Browser: live refresh 60 s → 5 min and only while the tab is visible; homepage cache 60 s → 10 min (purge on publish).
* `JD_EGRESS_METER=true` (opt-in): per-run request/byte counts by table/RPC in each worker's run metadata (`metadata.egress`) — real numbers within minutes of resuming.

## 5. Monthly estimate (raw decoded JSON bytes; Free allowance 5 GB/month)
Per-call sizes measured; call counts from the schedule; per-fetch-run cost (~20 KB), bundle reads and the misc line are MODELED. Compression (likely 3–4× for this JSON) is assumed, not measured.

| Scenario | Workers | Site | Total raw | % of 5 GB | If 3× / 4× compressed |
|---|---|---|---|---|---|
| A. Current supply (~10 stories/day), editorial every 5 min | 2.1 GB | 1.7 GB | **3.9 GB** | 77% | 1.3 / 1.0 GB |
| B. 100 stories/day, four-district-first, editorial every 5 min | 2.6 GB | 2.1 GB | **4.7 GB** | 94% | 1.6 / 1.2 GB |
| C. as B, editorial every 10 min | 2.0 GB | 2.1 GB | **4.1 GB** | 83% | 1.4 / 1.0 GB |
Before these fixes the same workload modeled at ≈ 50 GB raw per 14 days.
**Verdict: not yet "comfortably below" the allowance on a raw basis** (B is 94%). It is comfortable only if the platform bills compressed bytes (likely, unconfirmed). Do not run B on day one.

### Next reductions (each ≈ 0.3–0.6 GB raw/month; not yet done)
1. Slimmer list-card view (drop `seo_title`, trim `editorial_metadata`/`geo_metadata` to the keys cards use): pool row 4.6 KB → ~3 KB.
2. Keep the story index + candidate slate in Redis (Upstash, not Supabase egress) for ~9 minutes.
3. Fetch: carry the loaded source state into the upsert instead of re-reading it (removes ~2 of 3 reads per source per run).
4. Legacy `jd-cron-jobs` / intelligence snapshot (`buildNewsroomIntelligenceSnapshot`: ~2 MB per build) — keep the job off or ≥ 6 h apart; the Edge workers replace it.
5. Only emit event/live pages for live events (they are crawled constantly).

## 6. Recovery (exactly one probe, then verify before enabling)
1. Owner records the §2 numbers. Do nothing until the billing period has reset.
2. `node scripts/supabase-recovery-check.mjs` — ONE REST request, prints the status only, refuses a second probe within 6 h, never enables anything.
3. If HTTP 200: `node scripts/edge-go-live.mjs preflight` (real-runtime checks: Edge workers, Redis atomicity, CodeCraft, DB headroom) — must be fully green.
4. Verify individually before the scheduler: fetch shard (one invocation, `inserted > 0`), cluster (0 duplicate events: `select count(*) from (select signal_id from news_event_signal_claims group by 1 having count(*)>1) x` = 0), editorial dry-run, Redis TTLs on `ai-quota:*`, CodeCraft one request.
5. Set Edge secret `JD_EGRESS_METER=true`; unset Vercel `JD_PAUSE_RECURRING` only if the daily crons are wanted (they are not required).
6. First week: change `jd-edge-editorial-generate` to every 10 minutes, then `node scripts/edge-go-live.mjs enable --apply` and `observe 12`.
7. After 24–48 h compare the cron-run metadata (`metadata.egress`) × schedule with the dashboard egress; correct §5; only then raise cadence/volume.
