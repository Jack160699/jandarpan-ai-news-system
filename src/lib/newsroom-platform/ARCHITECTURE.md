# Jan Darpan Newsroom Platform

Mock-first modular architecture for regional newsroom feeds. APIs and Supabase reads are stubbed until wired.

## Layers

1. **Content** (`content/types.ts`, `validate.ts`, `mock/`) — unified `PlatformArticle` for all content types.
2. **Feeds** (`feeds/`) — server functions: breaking, district, global-brief, topics.
3. **API** (`app/api/newsroom/*`) — JSON + ISR cache headers for client hooks.
4. **Pages** — `/topics/[slug]`, `/districts/[district]`, `/news/national`, `/news/international`.
5. **AI** (`ai-processing/`) — queue + service interfaces only (no OpenAI).
6. **DB** (`db/`, `supabase/migrations/022_newsroom_platform.sql`) — schema prep.

## ISR (seconds)

| Surface | Value |
|---------|-------|
| Breaking API | 30 |
| District API / page | 120 |
| Global brief | 90 |
| Topic hub | 300 |

## Admin

`/admin/articles`, `/admin/districts`, `/admin/topics`, `/admin/sources`, `/admin/settings` — Supabase-backed via `/api/admin/platform/*`.
