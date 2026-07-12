# Supabase Egress Audit

**Project:** newspaper-motion (Next.js 16 + Supabase)  
**Audit date:** 2026-07-07  
**Scope:** Full codebase read-only audit — no code changes  
**Context:** Database ~271 MB, monthly egress >10 GB (≈37× DB size)

---

## Executive summary

Egress is dominated by **repeated, uncached reads of large `generated_articles` payloads** (especially `article_body`), not by database size. The three largest contributors are:

1. **Client live polling** (`/api/homepage/live`) — fetches up to **120 full rows including `article_body`** every 60–120s per active homepage/live-desk session, with **no server cache**.
2. **Per-request middleware auth** — `auth.getUser()` on **every non-exempt page/API hit**, multiplying Supabase Auth traffic.
3. **Dynamic listing pages + sitemaps** — `fetchGeneratedArticlePool()` with default **full** select (includes `article_body`) on category pages (`force-dynamic`), sitemap (800 rows), RSS, search index rebuilds, and story related-articles pools.

Cron/QStash pipelines (every 30 minutes) add steady background egress via `select("*")`, embedding backlogs (`limit(20000)` on `intelligence_embeddings`), and intelligence snapshot builds (100 articles + 80 signals with `raw_content`).

**Estimated monthly egress mix (order of magnitude):**

| Source | Est. share | Notes |
|--------|------------|-------|
| Live homepage polling | **35–50%** | Scales linearly with concurrent readers |
| Public page renders (ISR + dynamic) | **15–25%** | Homepage ISR is partially optimized; category is not |
| Middleware `getUser` (Auth API) | **10–20%** | Every matched route |
| Cron / QStash workers | **10–15%** | 48+ orchestrate + 48+ ingest runs/day |
| Sitemaps / crawlers | **5–10%** | 800-row full pool per sitemap hit |
| Admin dashboards / health | **3–8%** | Polling + `runAllHealthChecks()` |
| Client auth + subscriptions | **1–3%** | `useSupabase`, `reader_subscriptions` |
| Realtime | **<1%** | Triggers polls; channel overhead small vs DB reads |

Payload assumption used below: **~2–4 KB/row** for `GENERATED_SELECT` (with `article_body`), **~0.8 KB/row** for `GENERATED_SELECT_HOMEPAGE` (no body).

---

## 1. Every place Supabase is queried

### 1.1 Client factories

| Module | Client | Usage |
|--------|--------|-------|
| `src/lib/supabase/client.ts` | Browser anon | Auth, realtime, `reader_subscriptions` |
| `src/lib/supabase/server.ts` | Server anon + cookies | Public reads, editorial auth |
| `src/lib/supabase/admin.ts` | Service role | Cron, admin, writes, intelligence |
| `src/lib/supabase/middleware.ts` | SSR cookie client | `auth.getUser()` per request |
| `src/lib/supabase/queries.ts` | Anon | Legacy `news_articles` paginated reads |
| `src/lib/supabase/auth.ts` | Auth helpers | Login/session |

### 1.2 Public read layer (highest traffic)

| File | Table(s) | Pattern |
|------|----------|---------|
| `src/lib/newsroom/generated/read.ts` | `generated_articles` | Pool, slug lookup (up to 3 queries/slug) |
| `src/lib/news/live-feed/resolve-pool.ts` | via `fetchGeneratedArticlePool` | Homepage + live snapshot resolver |
| `src/lib/homepage/get-feed.ts` | via resolver | ISR + Redis homepage build |
| `src/lib/realtime/build-snapshot.ts` | via resolver | Live API snapshot |
| `src/lib/search/search.ts` | via pool | Search index (200 rows) |
| `src/lib/seo/sitemap-data.ts` | via pool | Sitemap 800 rows, Google News 200 |
| `src/lib/news-db.ts` | `news_articles` | Legacy pool 280 rows `EXTENDED_ARTICLE_SELECT` |
| `src/lib/organization/settings.ts` | `platform_config` | **Every root layout render** |

### 1.3 News pipeline & cron (background)

| File | Table(s) | Pattern |
|------|----------|---------|
| `src/lib/news/pipeline/scalable-ingest.ts` | `ingestion_logs`, signals, articles | Ingest writes + reads |
| `src/lib/news/ai/process.ts` | `news_articles` | `select("*")` batch AI enrich |
| `src/lib/news/ai/queue.ts` | `news_ai_queue` | Claim RPC, counts |
| `src/lib/news/ai/generate-article.ts` | `news_signals`, `generated_articles`, `news_events` | `select("*")` |
| `src/lib/news/ai/generate-editorial-image.ts` | `generated_articles`, `news_events`, `news_signals` | `select("*")` + **storage upload** |
| `src/lib/news/ai/event-clustering.ts` | `news_events`, `news_signals` | `select("*")` |
| `src/lib/i18n/multilingual/translation-queue.ts` | `generated_articles`, `worker_jobs` | Coverage audits |
| `src/lib/infrastructure/jobs/handlers.ts` | `news_signals`, embeddings, `generated_articles`, DAM | Embed batch; **reads 20k embedding ids** |
| `src/lib/infrastructure/jobs/queue.ts` | `worker_jobs` | `select("*")` |
| `src/lib/infrastructure/events/event-bus.ts` | `event_bus_messages` | `select("*")` |
| `src/lib/ops/queue-cleanup.ts` | Many tables | Retention sweeps |
| `src/lib/ops/data-retention.ts` | Many tables | Daily cleanup cron |

### 1.4 Intelligence & analytics

| File | Table(s) | Pattern |
|------|----------|---------|
| `src/lib/intelligence/build-snapshot.ts` | `generated_articles` (100 + body), `news_signals` (80 + raw_content), `news_events`, `rss_source_health` `select("*")` | Full snapshot |
| `src/lib/intelligence/vector/vector-store.ts` | `intelligence_embeddings` | Upsert + RPC `match_*` |
| `src/lib/analytics/enterprise-aggregate.ts` | `reader_analytics_events` (8000 rows), `generated_articles` (200) | Enterprise report |
| `src/lib/analytics/aggregate.ts` | `reader_analytics_events`, snapshots | Base report |
| `src/lib/analytics/persist.ts` | `reader_analytics_events` | Inserts from client |

### 1.5 Admin / editorial / DAM / security

| File | Table(s) | Pattern |
|------|----------|---------|
| `src/lib/editorial-dashboard/fetch-dashboard.ts` | 10 parallel queries | `ingestion_logs` `select("*")`, `rss_source_health` `select("*")` |
| `src/lib/dashboard/fetch-snapshot.ts` | Multiple | `select("*")` on health tables |
| `src/lib/platform-admin/*.ts` | districts, topics, sources, articles | Mixed |
| `src/lib/dam/store.ts` | `dam_assets`, variants | Many `select("*")` |
| `src/lib/collaboration/store.ts` | collab tables | 12× `select("*")` |
| `src/lib/security/session-store.ts` | `security_sessions`, devices | Session CRUD |
| `src/lib/saas-auth/session.ts` | `tenant_memberships`, `newsroom_tenants` | Dashboard auth |
| `src/lib/monetization/fetch-payload.ts` | monetization tables | `select("*")` |

### 1.6 Observability

| File | Table(s) | Pattern |
|------|----------|---------|
| `src/lib/observability/health/checks.ts` | `generated_articles`, storage, embeddings, analytics, ingestion | **11 checks per `runAllHealthChecks()`** |
| `src/lib/news/rss-health.ts` | `rss_source_health` | `select("*")` (used inside health ingestion check) |

---

## 2. Every API route using Supabase

### Direct Supabase in route handler

| Route | Client | Tables / ops |
|-------|--------|----------------|
| `GET/POST /api/fetch-news` | via `runScalableIngestion` | Ingest pipeline + `refreshSnapshotFromDatabase` |
| `GET/POST /api/cron/orchestrate` | workers | Full intelligence pipeline |
| `GET/POST /api/cron/translation-backfill` | translation queue | Articles + worker_jobs |
| `GET/POST /api/cron/cleanup` | retention | Multi-table deletes/reads |
| `GET/POST /api/cron/jobs` | event bus + job queue | worker_jobs |
| `GET/POST /api/cron/worker/[name]` | workers | Per-worker Supabase |
| `GET /api/cron/workers/health` | monitor | Queue stats |
| `GET/POST /api/process-ai` | `process.ts` | `news_articles` `select("*")` |
| `GET/POST /api/process-editorial-images` | image queue | generated_articles, storage |
| `GET/POST /api/generate-articles` | generate-article | Full pipeline |
| `GET /api/homepage/live` | **buildLiveHomepageSnapshot** | **120 full articles** |
| `GET /api/search` | executeSearch → getSearchIndex | 200 articles on cache miss |
| `GET /api/health` | **runAllHealthChecks** | ~8 Supabase queries every request |
| `GET /api/admin/ops/health` | runAllHealthChecks + dashboards | Heavy |
| `GET /api/editorial/dashboard` | fetchEditorialDashboard | 10 parallel queries |
| `GET /api/editorial/intelligence` | intelligence snapshot | 100 articles + signals |
| `GET /api/analytics/enterprise` | buildEnterpriseAnalyticsReport | Up to 8000 events |
| `GET /api/analytics/dashboard` | aggregate | Analytics tables |
| `POST /api/analytics/events` | persistReaderEvents | Inserts |
| `GET /api/newsroom/breaking` | fetchBreakingFeed | platform_breaking or generated_articles |
| `GET /api/newsroom/topics/[slug]` | platform queries | generated/platform articles |
| `GET /api/newsroom/districts/[slug]` | platform queries | generated articles |
| `GET /api/newsroom/global-brief` | platform feeds | DB reads |
| `GET /api/regional/feed` | fetchGeneratedArticlePool(100) | Full select |
| `GET /api/regional/alerts` | fetchGeneratedArticlePool(80) | Full select |
| `GET /api/shorts/feed` | shorts builder | generated_articles |
| `GET /api/shorts/voice/[slug]` | getGeneratedArticleBySlug + update | generated_articles |
| `GET /api/feed.xml` (page route) | fetchGeneratedArticlePool(100) | Full select |
| `GET /api/security/audit` | security tables | 3× `select("*")` |
| `GET/POST /api/editorial/article/[id]` | generated_articles | Multiple reads/writes |
| `GET/POST /api/editorial/article` | generated_articles | List/create |
| `GET/POST /api/dam/*` | dam store | Assets, storage |
| `GET/POST /api/collaboration/*` | collaboration store | Many reads |
| `GET/POST /api/dashboard/*` | session, snapshot, team | Membership + snapshots |
| `GET/POST /api/admin/platform/*` | platform-admin libs | Config CRUD |
| `GET /api/debug/ingestion` | admin | logs, failures, health `select("*")` |
| `GET /api/contact` | fetchOrganizationSettings | platform_config |
| `GET/POST /api/monetization/newsletter` | newsletters, subscribers | CRUD |

### Indirect (lib only, no direct import in route)

Routes that call libraries which query Supabase: most `/api/editorial/*`, `/api/admin/ops/executive`, `/api/translate`, `/api/shorts/generate`, `/api/rss-health`, `/api/story/analytics`, etc.

---

## 3. Every page using Supabase

| Page | Revalidate | Dynamic | Supabase access |
|------|------------|---------|-----------------|
| `/` (home) | 60 | static ISR | `getCachedGeneratedHomepageFeed` → pool **homepage select** |
| `/live` | 60 | ISR | Same homepage feed |
| `/listen` | 60 | ISR | Same homepage feed |
| `/story/[slug]` | 60 | ISR + SSG params | Slug (1–3 queries) + **pool 80 full** + optional `news_events` |
| `/shorts/[slug]` | 60 | ISR | `getGeneratedArticleBySlug` ×2 (metadata + page) |
| `/category/[slug]` | — | **force-dynamic** | **fetchGeneratedArticlePool(120) full** every request |
| `/district/[slug]` | 60 | ISR | fetchGeneratedArticlePool(120) full |
| `/topics/[slug]` | 300 | ISR | Platform/generated queries |
| `/search` | 60 | ISR | Search index via executeSearch |
| `/premium/[slug]` | — | dynamic | `premium_reports` `select("*")` |
| `/sitemap.xml` | 3600 | **force-dynamic** | **fetchGeneratedArticlePool(800) full** |
| `/news-sitemap.xml` | 300 | force-dynamic | fetchGeneratedArticlePool(200) |
| `/feed.xml` | 3600 | force-dynamic | pool 100 + organization settings |
| **Root `layout.tsx`** | per request | — | **fetchOrganizationSettings** (admin client) |
| All `/admin/*` | force-dynamic | — | Dashboard, DAM, intelligence, etc. |
| `/debug/supabase` | force-dynamic | — | Test query `news_articles` |

---

## 4. Client-side Supabase queries

| Location | What | Egress impact |
|----------|------|---------------|
| `src/hooks/useSupabase.ts` | `auth.getUser()`, `onAuthStateChange` | Low per user; auth API not PostgREST |
| `src/providers/ReaderAccountProvider.tsx` | `.from("reader_subscriptions").select("status")` | **Direct browser → Supabase** on login |
| `src/hooks/useRealtimeTrigger.ts` | Realtime channel on `generated_articles` | Small realtime egress; **triggers HTTP poll** |
| `src/hooks/useCollaborationRoom.ts` | Collab realtime channel | Admin-only |
| `src/lib/realtime/realtime-manager.ts` | Browser client channels | Admin + homepage live |

**Note:** Most reader traffic does **not** query Supabase from the browser directly except auth and premium subscription check. The dominant client-driven egress path is **polling `/api/homepage/live`** (server-side Supabase), not browser PostgREST.

---

## 5. Server-side Supabase queries

All `createAnonServerClient`, `createAdminServerClient`, `createAdminClient`, and `createCookieServerClient` usage is server-side. High-volume server paths:

1. `resolveLiveArticlePool` / `fetchGeneratedArticlePool`
2. `getGeneratedHomepageFeed` (ISR + Redis)
3. `buildLiveHomepageSnapshot`
4. `executeSearch` → `getSearchIndex`
5. `buildMainSitemap` / `buildGoogleNewsEntries`
6. `fetchOrganizationSettings` (layout)
7. `updateSupabaseSession` → `auth.getUser` (middleware)
8. Cron workers via QStash + Vercel cron

---

## 6. Cron jobs reading Supabase

### QStash schedules (`scripts/setup-qstash-schedules.mjs`)

| Schedule | Cron | Route | DB impact |
|----------|------|-------|-----------|
| fetch-news | `7,37 * * * *` (every 30m) | `/api/fetch-news` | Ingest writes, signal reads, **refreshSnapshotFromDatabase(120)** |
| orchestrate | `15,45 * * * *` (every 30m) | `/api/cron/orchestrate` | ai_enrich, job_processor, embed, **intelligence_snapshot**, analytics, editorial_images |
| workers-health | `0 * * * *` | `/api/cron/workers/health` | Queue monitors |
| translation-backfill | `20 */6 * * *` | `/api/cron/translation-backfill` | Article scans + worker_jobs |

### Vercel cron (`vercel.json`)

| Job | Schedule | Route |
|-----|----------|-------|
| fetch-news | Daily 00:15 UTC | Backup ingest |
| editorial_generate | Daily 00:45 UTC | Backup generation |
| translation-backfill | Daily 01:20 UTC | Backup |
| cleanup | Daily 03:30 UTC | `runProductionRetention` |

### Workers inside orchestrate (each run)

- `intelligence_embed`: reads up to **20,000** `intelligence_embeddings.entity_id` then hydrates signals
- `intelligence_snapshot`: `buildNewsroomIntelligenceSnapshot` — 100 articles w/ body, 80 signals w/ raw_content
- `job_processor`: editorial generate, translate, embed jobs
- `editorial_images`: `select("*")` batches on articles/events/signals
- `analytics_aggregate`: analytics_snapshots upsert

---

## 7. Polling loops

| Component | Interval | Endpoint / action | Supabase? |
|-----------|----------|-------------------|-----------|
| `useNewsroomPolling` | 60–120s jitter | `GET /api/homepage/live` | **Yes — 120 full rows** |
| `useRealtimeTrigger` | on DB change + debounce 2.5s | Triggers poll above | Realtime + poll |
| `HealthOperationsPanel` | 60s | `/api/admin/ops/health` | runAllHealthChecks |
| `LaunchHealthWidgets` | 60s | health API | Same |
| `EnterpriseAnalyticsPanel` | 120s | `/api/analytics/enterprise` | Up to 8000 events |
| `useEditorialDashboardQuery` | 120–300s | `/api/editorial/dashboard` | 10 queries |
| `WorkflowBoardPanel` | 20s | editorial workflow API | workflow store |
| `CollaborationHubPanel` | 12s | collaboration hub | collab store |
| `IntelligenceMissionPanel` | 30s | intelligence API | snapshot |
| `IntelligenceCenterPanel` | 60s | intelligence API | snapshot |
| `ExecutiveCfoPanel` | env POLL_MS | executive API | openai_usage, articles |
| `LiveDeskRefresh` / `HomeLiveRefresh` | page refresh | navigation / soft refresh | Triggers RSC refetch |
| `useAnalyticsCollector` | flush interval | POST `/api/analytics/events` | Writes |

---

## 8. Realtime subscriptions

| Channel | File | Table | Effect |
|-------|------|-------|--------|
| `newsroom-homepage-live` | `useRealtimeTrigger.ts` | `generated_articles` INSERT/UPDATE | Debounced **full pool refetch** via live API |
| Collab channels | `useCollaborationRoom.ts` | collab tables | Admin editor only |

Realtime **wal** traffic is small relative to PostgREST; the problem is **poll amplification** when realtime fires during active sessions.

---

## 9. Returning more columns than necessary

| Location | Issue | Wasted columns |
|----------|-------|----------------|
| `buildLiveHomepageSnapshot` | Uses default pool (**full** `GENERATED_SELECT`) | **`article_body`** on 120 rows per poll |
| `fetchGeneratedArticlePool` default | Includes `article_body` | Used by category, district, sitemap, search, story related, regional APIs |
| `story/[slug]/page.tsx` | Related pool 80 with full select | body not needed for cards |
| `buildNewsroomIntelligenceSnapshot` | 100 articles with `article_body`, `translations` | Dashboard cards need headline/summary only |
| `enterprise-aggregate` | 8000 analytics events for 168h window | Many columns per event |
| `news-db fetchArticlePool` | `EXTENDED_ARTICLE_SELECT` includes full `content` | 280 rows |
| `getArticleBySlug` fallback | Fetches **400** extended rows to find slug match | Massive over-fetch |
| `loadSignalsForEmbed` | `limit(20000)` on embedding ids | Only needs ids for Set membership |
| Health `checkIngestion` | Pulls full RSS health via `select("*")` | Dashboard fields only |

**Positive example:** `getGeneratedHomepageFeed` uses `select: "homepage"` (`GENERATED_SELECT_HOMEPAGE` omits `article_body`).

---

## 10. Queries using `select("*")`

**55+ occurrences.** Highest egress risk:

| File | Table(s) | Context |
|------|----------|---------|
| `src/lib/news/ai/process.ts` | `news_articles` | AI batch (limit from config) |
| `src/lib/news/ai/generate-article.ts` | `news_signals`, `generated_articles`, `news_events` | Generation pipeline |
| `src/lib/news/ai/generate-editorial-image.ts` | `generated_articles`, `news_events`, `news_signals` | Image worker |
| `src/lib/editorial-dashboard/fetch-dashboard.ts` | `ingestion_logs`, `rss_source_health` | Dashboard |
| `src/lib/intelligence/build-snapshot.ts` | `rss_source_health` | Snapshot |
| `src/lib/dam/store.ts` | `dam_assets`, variants | DAM library (12×) |
| `src/lib/collaboration/store.ts` | collab tables | 12× |
| `src/lib/infrastructure/jobs/queue.ts` | `worker_jobs` | Job processor |
| `src/lib/infrastructure/events/event-bus.ts` | `event_bus_messages` | Event delivery |
| `src/lib/monetization/fetch-payload.ts` | 5 tables | Monetization |
| `src/lib/news/rss-health.ts` | `rss_source_health` | Called from health checks |
| `src/app/api/security/audit/route.ts` | 3 security tables | Audit API |
| `src/app/premium/[slug]/page.tsx` | `premium_reports` | Premium content |
| `src/app/api/debug/ingestion/route.ts` | logs, failures, health | Debug |

---

## 11. Missing pagination

| Query | Limit | Problem |
|-------|-------|---------|
| `fetchGeneratedArticlePool` | param default 280 | No cursor; large fixed limits |
| `buildMainSitemap` | **800** | Single blob for all story URLs |
| `getSearchIndex` | 200 | Full index in memory |
| `enterprise-aggregate` events | 8000 hard cap | No paging for dashboard |
| `loadSignalsForEmbed` embedded ids | **20000** | No pagination |
| `rss_source_health` in dashboard/health | **unlimited** | All rows every poll |
| `getArticleBySlug` fallback | 400 | Scan without pagination |
| `news-db fetchArticlePool` | 280 | Legacy full pool |
| Intelligence signals | 80 | OK for worker; API read mode same |

---

## 12. Missing limits

Generally limits exist but are **set too high** for egress-sensitive paths (800 sitemap, 280 legacy pool, 120 live poll). Unbounded:

- `rss_source_health` selects in dashboard + `getRssHealthDashboard`
- `platform_config` is single row (OK)
- Some collab/DAM list endpoints use limits but `select("*")` inflates rows

---

## 13. Missing caching

| Path | Cache today | Gap |
|------|-------------|-----|
| Homepage ISR feed | `unstable_cache` 60s + Redis | Good for **homepage select** |
| `/api/homepage/live` | **None** (`revalidate=0`, `no-store`) | **Critical gap** |
| Live poll client | `cache: "no-store"` | By design; drives egress |
| Search index | `unstable_cache` 120s | OK; miss still loads 200 full rows |
| Sitemap | `revalidate=3600` but `force-dynamic` | Still hits DB per request at edge |
| Category pages | **force-dynamic** | **No ISR** |
| `fetchOrganizationSettings` | **None** | Every layout request |
| Editorial dashboard | Redis 60s | OK when hit |
| Intelligence API | Redis TTL 60–90s | OK |
| Analytics enterprise | snapshot-cache | Miss loads 8000 events |
| Health checks | **None** | Full suite every `/api/health` call |
| Middleware auth | **None** | getUser every request |
| `getArticleBySlug` slug fallback | **None** | 400-row scan |

---

## 14. Missing `revalidate`

Pages/routes that **should** cache but don't or can't:

- `/api/homepage/live` — `revalidate = 0` (should edge-cache snapshot 30–60s)
- `/category/[slug]` — `force-dynamic` with no `revalidate`
- `/api/search` — `force-dynamic` (index cached internally, route is not)
- `/api/regional/feed` — `force-dynamic`, no cache
- All `/admin/*` — intentionally dynamic (acceptable)

Pages **with** `revalidate`: `/`, `/story/[slug]`, `/district/[slug]`, `/topics/[slug]`, `/search`, `/listen`, `/shorts`, `/live`, newsroom API routes (30–300s).

---

## 15. Missing `unstable_cache`

Not wrapped (high value targets):

- `buildLiveHomepageSnapshot` / `resolveLiveArticlePool` for live API
- `fetchOrganizationSettings`
- `fetchGeneratedArticlePool` for sitemap (keyed by limit + select mode)
- `getGeneratedArticleBySlug` (per slug)
- `runAllHealthChecks` (or individual expensive checks)
- Category/district pool fetches (share homepage pool tag)

**Already using `unstable_cache`:** `getGeneratedHomepageFeed` (partial), `getSearchIndex`, some ISR pages.

---

## 16. Missing React `cache()`

| Function | Wrapped? |
|----------|----------|
| `getGeneratedHomepageFeed` | Yes → `getCachedGeneratedHomepageFeed` |
| `getTenantConfig` | Yes |
| `getGeneratedArticleBySlug` | **No** — duplicate in `generateMetadata` + page |
| `fetchGeneratedArticlePool` | **No** |
| `fetchOrganizationSettings` | **No** — layout + feed.xml + about |
| `resolveLiveArticlePool` | **No** |

---

## 17. Missing fetch cache

- Client polls use `cache: "no-store"` (`useNewsroomPolling.ts`) — correct for freshness, bad for egress
- `src/lib/news/fetch-policy.ts` sets `next: { revalidate: 0 }` for wire APIs (external, not Supabase)
- Admin fetches use `cache: "no-store"` intentionally

---

## 18. Routes that should be static but are dynamic

| Route | Current | Should be |
|-------|---------|-----------|
| `/category/[slug]` | `force-dynamic` | ISR `revalidate=60` + homepage pool slice |
| `/sitemap.xml` | `force-dynamic` | ISR or `generateStaticParams` + on-demand revalidation |
| `/news-sitemap.xml` | `force-dynamic` | ISR 300s with slug-only query |
| `/feed.xml` | `force-dynamic` | ISR 3600 (already has revalidate export) |
| `/api/homepage/live` | `force-dynamic` | Edge-cached JSON 30–60s |
| `/api/regional/feed` | `force-dynamic` | `revalidate` + CDN |
| Root layout org settings | dynamic per hit | `unstable_cache` 300s+ |

---

## 19. Queries executed during every request

| Trigger | Query |
|---------|-------|
| **Middleware** (almost all routes) | `auth.getUser()` via `updateSupabaseSession` |
| **Root layout** | `fetchOrganizationSettings` → `platform_config` |
| **Homepage user session** | ISR homepage feed (60s) + **live poll every 60–120s** |
| **`/api/health`** (if monitored) | Full `runAllHealthChecks()` — 8+ Supabase ops |

For a typical anonymous reader on homepage: **1 auth + 1 org config + 1 ISR homepage build (avg 1/min per edge) + 40–60 live polls/hour**.

---

## 20. Duplicate queries for identical data

| Duplicate | Where | Impact |
|-----------|-------|--------|
| Homepage pool | `getGeneratedHomepageFeed` fresh-wire path calls `resolveLiveArticlePool` **twice** | 2× 120 rows on wire fallback |
| Story slug | `generateMetadata` + page both call `getGeneratedArticleBySlug` | 2–6 queries/story view |
| Shorts slug | Same pattern | 2× slug queries |
| Search vs homepage | Separate `fetchGeneratedArticlePool(200)` vs homepage pool | Same table, different cache keys |
| Sitemap + news-sitemap | 800 + 200 row pools | Overlapping data same request cycle for crawlers |
| Health checks | `/api/health` and `/api/admin/ops/health` both run `runAllHealthChecks` | Duplicate when both polled |
| Ingest revalidation | Per-batch + end-of-run `revalidateNewsroomCaches` | Indirect DB via ISR misses |
| Realtime + interval poll | Both active on homepage | Poll runs on timer **and** on every articles change |

---

## Ranked issues by expected bandwidth savings

| Rank | Issue | Est. savings | Effort | Primary files |
|------|-------|--------------|--------|---------------|
| **1** | Live API uses **full** pool (120 × `article_body`) uncached | **30–45%** | Low | `build-snapshot.ts`, `homepage/live/route.ts` |
| **2** | Client polling 60–120s per homepage/live session | **20–35%** (with #1) | Med | `useNewsroomPolling.ts`, `LiveNewsroomProvider.tsx` |
| **3** | Middleware `getUser` on all anonymous traffic | **10–18%** | Med | `middleware.ts`, `auth-safe.ts` |
| **4** | Category `force-dynamic` + full pool 120 | **5–12%** | Low | `category/[slug]/page.tsx` |
| **5** | Sitemap `fetchGeneratedArticlePool(800)` full select | **4–8%** | Low | `sitemap-data.ts` |
| **6** | Story page related `fetchGeneratedArticlePool(80)` full | **3–7%** | Low | `story/[slug]/page.tsx` |
| **7** | Search index 200 full rows / 120s cache miss | **2–5%** | Low | `search/search.ts` |
| **8** | `fetchOrganizationSettings` every layout | **2–4%** | Low | `layout.tsx`, `settings.ts` |
| **9** | `runAllHealthChecks` on public `/api/health` | **2–4%** | Low | `api/health/route.ts`, `checks.ts` |
| **10** | Embed worker `limit(20000)` embedding ids | **2–3%** | Med | `jobs/handlers.ts` |
| **11** | Intelligence snapshot 100 articles + 80 raw signals / 30m | **2–3%** | Med | `build-snapshot.ts`, orchestrate |
| **12** | Enterprise analytics 8000 events + admin poll 120s | **1–3%** | Med | `enterprise-aggregate.ts` |
| **13** | Editorial dashboard `select("*")` on logs/health + poll | **1–2%** | Low | `fetch-dashboard.ts` |
| **14** | `getArticleBySlug` 400-row fallback scan | **1–2%** | Low | `news-db.ts`, `generated/read.ts` |
| **15** | District/regional/feed.xml pools (full select) | **1–2%** | Low | district page, `feed.xml`, regional APIs |
| **16** | Widespread pipeline `select("*")` on cron | **1–2%** | Med | `process.ts`, `generate-article.ts`, images |
| **17** | Realtime-triggered extra polls | **1–2%** | Low | `useRealtimeTrigger.ts` |
| **18** | Duplicate homepage pool on fresh-wire path | **0.5–1%** | Low | `get-feed.ts` |
| **19** | Legacy `news_articles` pool 280 extended | **<1%** | Low | `news-db.ts` (deprecated path) |
| **20** | Browser `reader_subscriptions` query | **<0.5%** | Low | `ReaderAccountProvider.tsx` |

---

## Deep dive: top 3 egress drivers

### A. `/api/homepage/live` polling chain

```
HomepageLiveView → LiveNewsroomProvider → useNewsroomPolling (60–120s)
  → fetch /api/homepage/live (no-store)
    → buildLiveHomepageSnapshot()
      → resolveLiveArticlePool(120)  // NO { select: "homepage" }
        → fetchGeneratedArticlePool(120)  // GENERATED_SELECT includes article_body
```

- **Config:** `REALTIME_CONFIG.pollMinMs=60000`, `pollMaxMs=120000` (`src/lib/realtime/config.ts`)
- **Route:** `dynamic=force-dynamic`, `revalidate=0` (`src/app/api/homepage/live/route.ts`)
- **Est. payload:** 120 × ~3 KB ≈ **360 KB/poll/user**
- **Est. monthly (50 avg concurrent readers, 8h/day):**  
  50 × (8×3600/90) × 360 KB × 30 ≈ **1.7 TB** theoretical upper bound; even **5 concurrent** ≈ **170 GB/month**

This single path can explain **>10 GB/month** at modest traffic.

### B. Homepage ISR (partially optimized)

```
getGeneratedHomepageFeed → unstable_cache(60s) → resolveLiveArticlePool(120, { select: "homepage" })
```

ISR path omits `article_body` — good. Redis hit skips DB entirely — good. Problem is **parallel live polling** still pulls full bodies for the same users.

### C. Middleware auth on every page

`src/middleware.ts` calls `updateSupabaseSession` → `safeGetUser` for all routes except cron/ingestion/health bypass list. Anonymous readers still invoke Auth API once per navigation. At 100k page views/month × ~1–2 KB ≈ **100–200 MB** minimum, often more with JWT validation overhead.

---

## Caching inventory (what exists)

| Mechanism | Location | TTL | Tags |
|-----------|----------|-----|------|
| `unstable_cache` | `get-feed.ts` | 60s | homepage, tenant, lang |
| `unstable_cache` | `search/search.ts` | 120s | news-search-index |
| Redis | homepage feed key | 60s | per tenant/lang |
| Redis | dashboard, intelligence, analytics | 60–120s | per tenant |
| ISR `revalidate` | public pages | 60–3600s | various |
| `React cache()` | homepage feed, tenant | per-request | dedupe |
| Stale snapshot | `stale-snapshot.ts` | disk/KV | wire fallback only |

**Gaps:** live API, layout org settings, category pages, sitemap slug-only query, health checks, middleware auth.

---

## Recommendations preview (audit only — not implemented)

1. Pass `{ select: "homepage" }` to `resolveLiveArticlePool` in `build-snapshot.ts`.
2. Add `unstable_cache` or Redis to `/api/homepage/live` (30–60s); return diff/version only to clients.
3. Increase poll interval or disable interval when tab hidden (partially done) and when realtime connected.
4. Remove `force-dynamic` from category pages; reuse cached homepage pool.
5. Sitemap: `select("slug,published_at,created_at")` limit 800.
6. Skip middleware `getUser` for anonymous public routes (cookie presence check first).
7. `unstable_cache(fetchOrganizationSettings)` in layout.
8. Narrow all pipeline `select("*")` to column lists.
9. Split `/api/health` public liveness from authenticated deep checks.
10. Fix `get-feed.ts` double `resolveLiveArticlePool` on fresh-wire path.

---

## Appendix: `GENERATED_SELECT` vs `GENERATED_SELECT_HOMEPAGE`

```ts
// src/lib/newsroom/generated/read.ts
GENERATED_SELECT =
  "id,event_id,slug,headline,summary,article_body,hero_image_url,..."  // includes article_body

GENERATED_SELECT_HOMEPAGE =
  "id,event_id,slug,headline,summary,hero_image_url,..."  // omits article_body
```

Live polling uses the **full** select today. Homepage ISR uses **homepage** select. This inconsistency is the smoking gun for egress vs DB size disparity.

---

*End of audit. No files were modified.*
