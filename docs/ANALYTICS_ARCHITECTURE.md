# Enterprise Newsroom Analytics — Architecture

## Overview

Jan Darpan analytics combines **reader event telemetry** with **editorial desk metrics** in `/admin/analytics`. The enterprise layer extends the base `buildNewsroomAnalyticsReport()` with productivity, SEO, ranking, and admin insights.

## Analytics architecture

```
Reader site (story / homepage)
    → useAnalyticsCollector + ReaderAnalyticsTracker
    → POST /api/analytics/events
    → reader_analytics_events (+ article_metrics_daily rollups)

Admin /dashboard session
    → GET /api/analytics/enterprise?hours=
    → buildEnterpriseAnalyticsReport(tenantId)
        ├── buildNewsroomAnalyticsReport (views, CTR, heatmaps)
        ├── session_hash → live readers + retention
        ├── generated_articles → SEO, AI confidence, publishing velocity
        ├── editorial_workflow_events → productivity
        └── rankArticles + buildAdminInsights

Export / schedules
    → POST /api/analytics/export
    → GET/POST/DELETE /api/analytics/schedules
    → analytics_report_schedules (migration 029)
```

### Modules

| Module | Role |
|--------|------|
| `aggregate.ts` | Core reader metrics from events + daily rollups |
| `enterprise-aggregate.ts` | Extended KPIs, ranking, insights |
| `article-ranking.ts` | Composite rank score (engagement, reach, velocity, AI) |
| `admin-insights.ts` | Rule-based desk recommendations |
| `export-report.ts` | CSV / JSON export |
| `scheduled-reports.ts` | CRUD for scheduled exports |

### Metrics map

| Feature | Source |
|---------|--------|
| Live active readers | Unique `session_hash` in last 5 minutes |
| Article performance | Per-slug views, clicks, dwell, scroll |
| District engagement | `geo_metadata` / region on articles |
| SEO rankings | `seo_title`, `seo_description`, engagement proxy |
| CTR analytics | `article_click` / `article_view` by surface |
| Audience retention | Multi-event sessions over time buckets |
| Scroll depth | `scroll_depth` event distribution |
| Source performance | `editorial_metadata.source_attribution` |
| Newsroom productivity | Published vs draft + workflow events |
| Publishing velocity | Articles created/published per bucket |
| AI confidence trends | `editorial_metadata.ai_confidence` over time |
| Topic heatmaps | Article tags + view-weighted intensity |

## Realtime data strategy

1. **Ingestion** — Fire-and-forget POST batches from the client; no PII (anonymous `session_hash` only).
2. **Hot path** — Dashboard polls every **12 seconds** (`EnterpriseAnalyticsPanel`) for near-realtime KPIs without WebSockets.
3. **Aggregation** — Server-side in-memory aggregation per request (cap 8000 events). Suitable for desk scale; at high volume move to:
   - `article_metrics_daily` for historical charts
   - Materialized views or Timescale continuous aggregates
   - Redis counter for live reader count (`INCR` per session with TTL)
4. **Live readers** — Computed from last 5 minutes of events; optional upgrade: edge counter via Supabase Realtime or Redis.
5. **Scheduled reports** — Rows in `analytics_report_schedules`; run via external cron (Vercel cron / worker) calling export API and email — not yet wired in-app.
6. **Tenant isolation** — All queries scoped by `tenant_id` from dashboard session (not hostname-only tenant).

## UI

- **Theme** — `enterprise-analytics.css` dark glass (backdrop blur, gradient KPIs)
- **Charts** — Recharts (Area, Line, Bar) with framer-motion section entrance
- **Tabs** — Reader analytics (enterprise) | Desk metrics (legacy editorial snapshot)

## RBAC

`analytics:read` required for page and all analytics APIs.

## Applying database changes

Run migration `029_analytics_scheduled_reports.sql` on Supabase for scheduled report storage.
