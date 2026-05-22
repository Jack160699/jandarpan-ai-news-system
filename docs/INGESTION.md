# Hybrid News Ingestion System

Production-grade automated pipeline for **Chhattisgarh local**, **India national**, and **global** news.

## Folder structure

```
.github/workflows/
  news-cron.yml              # GitHub Actions — every 30 min

src/app/api/
  fetch-news/route.ts        # Main ingestion (GET/POST)
  health/route.ts            # Health / provider status

src/app/admin/ingestion/
  page.tsx                   # Internal dashboard (?key=ADMIN_SECRET)

src/lib/news/
  types.ts                   # NormalizedArticle, ProviderFetchResult
  http.ts                    # fetch + retry + timeout
  normalize.ts               # validation, dedupe, hashes
  admin-stats.ts             # Dashboard queries
  providers/
    rss-sources.ts           # CG/MPCG feed catalog + priority
    gnews.ts                 # India categories (GNews)
    newsdata.ts              # India + global (NewsData.io)
    rss.ts                   # Regional RSS orchestrator
    index.ts                 # Parallel orchestrator
  rss-health.ts              # Feed health / auto-disable dead feeds
  rss-fetch.ts               # Timeout + UTF-8 + malformed XML recovery
  language.ts                # Hindi / English detection
  images/
    extract.ts               # og/twitter/RSS/HTML extraction + scoring
    validate.ts              # Reject logos, ads, tiny placeholders
    enrich.ts                # Batch enrich during ingestion
    display.ts               # Card fallbacks (always valid URL)
    cache.ts                 # Per-run TTL cache
    fallbacks.ts             # Source → category → newsroom hierarchy
  pipeline/
    ingest.ts                # Batch upsert, logs, failures
  ai/
    process.ts               # Optional OpenAI enrichment

src/lib/types/news-article.ts
src/lib/news-db.ts           # Homepage read layer

supabase/migrations/
  001_news_articles.sql
  002_ingestion_pipeline.sql # logs, failures, AI columns
```

## Environment variables

| Variable | Required | Where |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Vercel |
| `GNEWS_API_KEY` | Recommended | Vercel — [gnews.io](https://gnews.io) |
| `NEWSDATA_API_KEY` | Recommended | Vercel — [newsdata.io](https://newsdata.io) |
| `CRON_SECRET` | Yes | Vercel + GitHub Actions |
| `ADMIN_SECRET` | Optional | Vercel — admin dashboard |
| `OPENAI_API_KEY` | Optional | Vercel — AI summaries |
| `OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |

Remove legacy: `NEWS_API_KEY`, `ALLOW_DEV_FETCH`

## Install

```bash
npm install
```

Adds `rss-parser`. NewsAPI / `axios` removed.

## Database migrations

Run in Supabase SQL Editor (in order):

1. `supabase/migrations/001_news_articles.sql`
2. `supabase/migrations/002_ingestion_pipeline.sql`
3. `supabase/migrations/003_rss_source_health.sql`

## Ingestion flow

```
GitHub Actions (cron)
    → /api/health
    → /api/fetch-news (Bearer CRON_SECRET)
        ├─ GNews (IN: business, tech, sports, entertainment, health, politics)
        ├─ NewsData.io (IN hi/en + world)
        └─ RSS (Chhattisgarh: Bhaskar, Patrika, Haribhoomi, NaiDunia, …)
    → normalize + dedupe (URL + title hash)
    → batch upsert news_articles
    → ingestion_logs + ingestion_failures
    → optional AI enrich (OpenAI)
Next.js homepage ← Supabase read (ISR)
```

## Deployment checklist

### Vercel

- [ ] Set all env vars above
- [ ] Remove `NEWS_API_KEY`
- [ ] Run migration `002` in Supabase
- [ ] Redeploy after env changes
- [ ] Test: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/fetch-news`

### GitHub Actions

- [ ] Repository secret `CRON_SECRET` (match Vercel)
- [ ] Actions → **News ingestion cron** → Run workflow
- [ ] Verify logs: category stats, `inserted` > 0

### Admin dashboard

`https://your-app.vercel.app/admin/ingestion?key=YOUR_ADMIN_SECRET`

### Production hardening

- Rotate `CRON_SECRET` periodically
- Do not link admin URL publicly
- Monitor `ingestion_logs` for `status: empty` runs
- RSS feed URLs may change — update `src/lib/news/providers/rss.ts`
- Free tiers: GNews 100 req/day, NewsData limited — RSS has no API quota

## Workflow testing

```bash
# Health
curl https://newspaper-motion.vercel.app/api/health

# Local ingestion
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/fetch-news?dev=1"
# or in dev without secret:
curl "http://localhost:3000/api/fetch-news?dev=1"
```

## Free-tier compatible

- GitHub Actions public repo: free scheduled runs
- Vercel hobby: serverless API
- Supabase free: PostgreSQL
- RSS: no API key
- AI: optional (skip without OpenAI key)
