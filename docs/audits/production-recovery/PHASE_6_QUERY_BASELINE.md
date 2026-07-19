# Phase 6 — Query Baseline (before)

Sources: three-day production audit (`DATABASE_AND_API_PERFORMANCE.md`, `INCIDENT_TIMELINE.md`), Phase 2 health contract, code inspection on `main` at Phase 5 tip.

## Incident signals

| Signal | Evidence |
|---|---|
| PostgreSQL `57014` | Vercel runtime errors Jul 19 — statement timeout on admin health / generated-pool paths |
| Sitemap latency | ~8s generation budget (`SITEMAP_QUERY_TIMEOUT_MS = 8000`) with full-row pool |
| Admin blank / degraded | system-status / health summary failures when pool query timed out |

## Hot queries (as found)

### 1. Generated pool — `fetchGeneratedArticlePool`

| Attribute | Baseline |
|---|---|
| Columns | Full select **including `article_body`** (default mode) |
| Filters | `published_at IS NOT NULL`, `editorial_status IN (approved, published, live)` |
| Order | `published_at DESC` |
| Limit | Call-site dependent; **sitemap used 800** |
| Indexes | `generated_articles_published_at_idx`, `generated_articles_editorial_status_idx` |
| Expected size | Tens–hundreds of rows × large text bodies |
| Duration | Timed out under load (app 8–12s; Postgres 57014) |

### 2. Admin / health — `checkSupabase`

| Attribute | Baseline |
|---|---|
| Columns | `id` head count |
| Filters | `editorial_status <> 'rejected'` (near-full table exact count) |
| Order / limit | none |
| Expected size | Exact count over almost all rows |
| Duration | Contributed to health summary budget overruns |

### 3. Sitemap — `buildMainSitemap`

| Attribute | Baseline |
|---|---|
| Pool call | `fetchGeneratedArticlePool(800)` full select |
| Fallback | `getGeneratedArticleSlugs(400)` which also used **full** pool |
| Cache | None in-process; route `revalidate = 3600` only |
| Duration | Observed ~8s path under timeout race |

### 4. Shell status / notifications / daily summary

| Surface | Pattern |
|---|---|
| Canonical health | Shared `getCanonicalHealth()` (Phase 2) — good |
| Risk | Timeout inside `checkSupabase` still degraded whole status |
| Notifications | `buildIncidentFeed` → `getCanonicalHealth()` |
| Owner daily | `getCanonicalHealth()` with 1.5s budget |

### 5. Other pool consumers (unbounded projection)

`search.ts`, `district/[slug]`, `feed.xml`, regional feed/alerts, debug snapshot — called full or default select even when body unused.

## Performance targets (Phase 6)

- Health summary &lt; 1.5s
- Generated-pool summary &lt; 1s
- Admin system status &lt; 1.5s
- Notification feed &lt; 1s when cached
- Warm sitemap &lt; 2s
- No PostgreSQL 57014 on tested paths
