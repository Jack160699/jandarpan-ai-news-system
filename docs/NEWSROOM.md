# AI-native newsroom architecture

## Data layers

| Layer | Table | Public | Purpose |
|-------|--------|--------|---------|
| Raw signals | `news_signals` | No | RSS/GNews/NewsData ingestion — never rendered |
| Events | `news_events` | No | AI-clustered real-world stories (dedupe) |
| Published | `generated_articles` | Yes | AI editorial output — future homepage source |
| Legacy | `news_articles` | Yes | Bridge for current homepage until cutover |

## Pipeline flow

```
Providers (RSS, GNews, NewsData)
    → sanitize + validate + image enrich
    → news_signals (upsert by article_url)
    → news_articles (legacy bridge, default ON)
    → [optional] news_events clustering
    → [optional] generated_articles publish
    → homepage cache revalidate
```

## Migration

Run `supabase/migrations/007_ai_newsroom_layers.sql` after 001–006.

## Environment flags

| Variable | Default | Effect |
|----------|---------|--------|
| `NEWSROOM_LEGACY_BRIDGE` | on | Dual-write to `news_articles` for homepage |
| `USE_GENERATED_ARTICLES` | off | Homepage reads `generated_articles` when on |
| `NEWSROOM_CLUSTER_EVENTS` | off | Post-ingest event clustering |
| `NEWSROOM_GENERATE_ARTICLES` | off | Publish from events to `generated_articles` |

## Cutover plan

1. Run migration 007
2. Ingest populates `news_signals` + legacy bridge
3. Enable clustering + generation when AI pipelines are ready
4. Set `USE_GENERATED_ARTICLES=true`
5. Set `NEWSROOM_LEGACY_BRIDGE=false`

## Code layout

- `src/lib/newsroom/signals/` — raw persistence
- `src/lib/newsroom/events/` — clustering (stub → AI)
- `src/lib/newsroom/generated/` — publish + read
- `src/lib/newsroom/bridge/` — legacy `news_articles` sync
