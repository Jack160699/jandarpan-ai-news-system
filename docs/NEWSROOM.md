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
    → [optional] news_events clustering (`clusterSignalsIntoEvents`)
    → [optional] generated_articles (`generateEditorialFromEvent`)
    → homepage cache revalidate
```

## Migration

Run `supabase/migrations/007_ai_newsroom_layers.sql` after 001–006.

## Environment flags

| Variable | Default | Effect |
|----------|---------|--------|
| `NEWSROOM_LEGACY_BRIDGE` | on | Dual-write to `news_articles` for homepage |
| `USE_GENERATED_ARTICLES` | legacy flag | Homepage always reads `generated_articles` (see `src/lib/homepage/`) |
| `NEWSROOM_CLUSTER_EVENTS` | off | Post-ingest event clustering |
| `NEWSROOM_GENERATE_ARTICLES` | off | LLM editorials → `generated_articles` (quality-gated) |
| `NEWSROOM_EDITORIAL_LANGUAGE` | auto | Force `hi` or `en` output |
| `NEWSROOM_EDITORIAL_MODEL` | gpt-4o-mini | Editorial generation model |

## Event clustering (`src/lib/news/ai/event-clustering.ts`)

Merges duplicate `news_signals` into one `news_events` row using:

- TF-IDF cosine similarity (keyword fallback)
- Title bigram similarity
- Named entity overlap (places, orgs)
- Category / region / time proximity
- Optional OpenAI embeddings when `NEWSROOM_USE_EMBEDDINGS=true`

Enable: `NEWSROOM_CLUSTER_EVENTS=true`

## Editorial generation (`src/lib/news/ai/generate-article.ts`)

Produces **original** copy from `news_events` + linked `news_signals`:

- Headline, summary, 5-section body, SEO fields, tags, reading time
- Hindi or English (`NEWSROOM_EDITORIAL_LANGUAGE` or auto)
- Quality gates (`editorial-guards.ts`): n-gram duplicate phrasing, source overlap, clickbait/unverified language, numeric fact alignment
- Only **passed** articles are inserted into `generated_articles` with `editorial_metadata` (confidence, attribution, checks)

Enable: `NEWSROOM_GENERATE_ARTICLES=true` + `OPENAI_API_KEY`

Run migration `009_generated_article_editorial_metadata.sql`.

## Search (`src/lib/search/`)

Multilingual search over `generated_articles`:

- `GET /api/search?q=...&district=raipur&category=india&time=today`
- Inverted index + TF-IDF semantic similarity + fuzzy typos
- Query parser for districts, categories, time scope (HI/EN)
- Public page `/search` with SEO `SearchAction` JSON-LD

## Homepage ranking (`src/lib/news/ai/ranking.ts`)

Priority scoring (0–100) for `generated_articles` homepage slots:

- Freshness + stale decay
- Urgency + breaking boost
- Regional-first (Chhattisgarh / Raipur)
- Source trust (AI confidence + attribution)
- Engagement potential (image, body depth, headline)
- Category importance weights
- Duplicate headline penalty (cluster dedupe)

Logs: `[newsroom:ranking] homepage_rank_complete`

## Editorial images (`src/lib/news/ai/generate-editorial-image.ts`)

Hero visuals for `generated_articles` with fallback hierarchy:

1. AI editorial illustration (moderated, WebP compressed, Supabase Storage CDN)
2. Best source signal image
3. Category illustration (Unsplash editorial set)

Features: dynamic prompts from headline/category/region/urgency/summary, queue + retries, duplicate prompt-hash reuse, OpenGraph 1200×630 variant.

Enable: `NEWSROOM_EDITORIAL_IMAGES=true` + `OPENAI_API_KEY` + public bucket `editorial-images`

Process queue: `POST /api/process-editorial-images` (CRON_SECRET)

## Cutover plan

1. Run migration 007
2. Ingest populates `news_signals` + legacy bridge
3. Enable clustering + generation when AI pipelines are ready
4. Set `USE_GENERATED_ARTICLES=true`
5. Set `NEWSROOM_LEGACY_BRIDGE=false`

## Code layout

- `src/lib/newsroom/signals/` — raw persistence
- `src/lib/newsroom/events/` — clustering orchestration
- `src/lib/news/ai/generate-article.ts` — editorial LLM + finalize
- `src/lib/news/ai/editorial-guards.ts` — hallucination / duplicate checks
- `src/lib/newsroom/generated/` — publish + read
- `src/lib/newsroom/bridge/` — legacy `news_articles` sync
