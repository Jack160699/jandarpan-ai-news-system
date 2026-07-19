# Database & API Performance

Sources: Vercel grouped runtime error clusters (7-day), `ops_cron_runs` durations, Supabase project status. Per-request p50/p95 percentiles are **not directly exposed** to the read-only tooling; values below are derived from error clusters and cron durations and are labelled as such.

## Headline

- **Supabase project:** ACTIVE_HEALTHY (Postgres 17.6, ap-northeast-1). No RLS-failure errors in the window.
- **A major Supabase incident occurred BEFORE the window** and is now resolved: `exceed_egress_quota` restriction ("Service for this project is restricted … exceed_egress_quota"). It generated the **largest** error clusters (legacy_upsert_failed ×3,288; upsert_batch_failed ×3,146; organization fetch ×1,652; generated_pool_query_error ×1,377; SEO/competitor/bootstrap failures) but **all with `last ≤ 2026-07-15 18:37 UTC`** on the old deployment `dpl_CB2Egn…` (commit e98372a). These stopped once egress was restored — which is exactly why ingestion resumed inserting thousands from Jul 16.

## In-window database/API issues

| Issue | Evidence | Window | Severity |
|---|---|---|---|
| **Statement timeout (57014) "canceling statement due to statement timeout"** | routes `/api/admin/ops/health`, `/`, `/api/admin/system-status`, `/api/admin/notifications`; `LIVE_FEED generated_pool_query_error`; durations 5,000–11,223 ms | last 2026-07-19 07:18 IST | **P2** — generated-pool query too slow; hits 5s statement timeout under the admin V3 deploys. |
| **Generated-pool query errors** | `[LIVE_FEED] generated_pool_query_error` (in-window instances all `statement timeout`; pre-window instances were egress-quota) | Jul 19 06:09–07:18 | P2 |
| **competitor-tracker 120s function timeout** | "Vercel Runtime Timeout Error: Task timed out after 120 seconds" ×49 lifetime | last 2026-07-19 06:30 | P3 |
| **DYNAMIC_SERVER_USAGE render error** | Server Components render error on `/topics/[slug]`, `/districts/[district]`, `/live/[slug]` ×1,095 | last 2026-07-18 22:23 | P3 |
| **AuthApiError: Invalid Refresh Token** | `/api/admin/notifications`, `/api/admin/ops/executive`, `/api/admin/system-status` ×10 | Jul 19 07:32–08:11 | P4 (admin session refresh) |
| GNews 403 / NewsData 429 | provider HTTP clusters | GNews ongoing; NewsData pre-window | see PROVIDER audit |

No evidence of RLS failures, connection-pool exhaustion, or destructive query patterns in-window.

## Slowest relevant routes (derived)

| Route | Signal | Approx duration | Dominant failure | Affected deployment |
|---|---|---|---|---|
| `/api/fetch-news` | cron duration | p50 ~57s, max 79s | `ingest_worker_failed` (misclassification) | all (unchanged logic) |
| `/api/cron/orchestrate` | cron duration | p50 ~90s, max 103s | always `degraded` (budget) | all |
| `/api/cron/competitor-tracker` | cron duration | ~110s, max 120s (timeout) | 120s function timeout | dpl_EnEJ… (9afa0d8) |
| `/api/admin/ops/health` | error cluster | up to 11.2s then timeout | statement timeout 57014 | dpl_Cx13… (60cd89d) |
| `/api/admin/system-status`, `/api/admin/notifications` | error cluster | 5s+ | statement timeout / auth refresh | dpl_Cx13… |
| `/sitemap.xml` | live fetch | **7.9s** (HTTP 200, 198 KB, 963 URLs) | slow but succeeds | current (33d1cb1) |
| `/news-sitemap.xml` | live fetch | 0.7s (HTTP 200) | none | current |
| `/story/[slug]` (sample) | live fetch | 3.0s (HTTP 200) | none | current |

Request counts / error counts / p95 per route are **not available** from the read-only tooling (would require Vercel Analytics/Observability with numeric percentiles). Disclosed as a data gap.

## Assessment

Database is **healthy overall now**, with a **localized P2 performance problem**: the generated-article pool query behind admin health/status and the homepage occasionally exceeds the 5s statement timeout (worst 11.2s) on Jul 19 morning — likely index/query-shape sensitivity on `generated_articles` amplified during the admin V3 deploy burst. The pre-window egress-quota outage is resolved. Recommended (not applied): review the generated-pool query plan / add covering index, and raise/relieve the `/api/cron/competitor-tracker` timeout.
