# CG Bhaskar — Concept Redesign

**Speculative premium redesign** for presentation and pitching purposes only.  
Not affiliated with CG Bhaskar. Not an official product.

## Experience

- Production-ready regional news platform (Next.js App Router)
- Mobile-first reading experience
- **Hybrid live wire** — GNews + NewsData.io + Chhattisgarh RSS → Supabase
- Static editorial desk content (concept stories)
- Multilingual UI (English, Hindi, Chhattisgarhi)

## Stack

- Next.js 16 · TypeScript · Tailwind CSS v4
- Supabase (PostgreSQL)
- GNews · NewsData.io · RSS (Chhattisgarh)
- Vercel (frontend + API)
- GitHub Actions (free scheduled ingestion)

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Local ingestion:

```bash
curl "http://localhost:3000/api/fetch-news?dev=1"
```

## Automated News Pipeline

### Architecture

```
GitHub Actions (every 30 min)
        │
        ├─► GET /api/health
        │
        ▼  Authorization: Bearer CRON_SECRET
Vercel  /api/fetch-news
        │
        ├── GNews (India: business, tech, sports, entertainment, health, politics)
        ├── NewsData.io (India hi/en + world)
        └── RSS (Chhattisgarh: Bhaskar, Patrika, Haribhoomi, NaiDunia, …)
        │
        ▼
Supabase  news_articles + ingestion_logs
        │
        ▼
Next.js homepage (Server Components) → /article/[id]
```

See **[docs/INGESTION.md](docs/INGESTION.md)** for full folder structure, migrations, and hardening notes.

### Database setup

Run in Supabase SQL Editor (order matters):

1. `supabase/migrations/001_news_articles.sql`
2. `supabase/migrations/002_ingestion_pipeline.sql`

### Environment variables (Vercel)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only upserts |
| `GNEWS_API_KEY` | Recommended | [gnews.io](https://gnews.io) — India headlines |
| `NEWSDATA_API_KEY` | Recommended | [newsdata.io](https://newsdata.io) — global + Hindi |
| `CRON_SECRET` | Yes | Bearer token for `/api/fetch-news` |
| `ADMIN_SECRET` | Optional | Admin dashboard `?key=` |
| `OPENAI_API_KEY` | Optional | AI summaries / headlines |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis cache (homepage feed) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash REST token |
| `INGEST_BUDGET_MS` | Optional | Serverless soft stop (default 52000) |
| `EDITORIAL_CONCURRENCY` | Optional | Parallel LLM prepares (default 2) |
| `HOMEPAGE_CACHE_SECONDS` | Optional | ISR + Redis TTL (default 60) |

### Production cron (Vercel)

`vercel.json` schedules the full pipeline:

- `POST /api/cron/orchestrate` — ingest → AI → editorial → images
- `POST /api/cron/worker/:name` — single worker (staggered)

Set `CRON_SECRET` in Vercel; Vercel Cron sends `Authorization: Bearer CRON_SECRET`.

Apply migration `012_api_provider_health.sql` for GNews/NewsData health scoring.

Logs: `[INGESTION_ANALYTICS]` JSON in function logs.

**Remove:** `NEWS_API_KEY`, `ALLOW_DEV_FETCH`

### GitHub repository secrets

| Secret | Required |
|--------|----------|
| `CRON_SECRET` | Yes — must match Vercel |

### Workflow testing

1. Add `CRON_SECRET` to GitHub Actions secrets.
2. **Actions → News ingestion cron → Run workflow**
3. Check logs for category stats and `"ok": true`.

```bash
curl -sS -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://newspaper-motion.vercel.app/api/fetch-news"
```

```bash
curl -sS "https://newspaper-motion.vercel.app/api/health"
```

### Admin dashboard

`/admin/ingestion?key=YOUR_ADMIN_SECRET` (or `CRON_SECRET` if `ADMIN_SECRET` unset)

## Deploy (Vercel)

```bash
npm run build
```

Deploy this directory as the project root.

**Note:** Use only `src/app/` for routes. Do not add a root-level `app/` folder.

- Framework: Next.js
- Root Directory: `.`
- Cron: Vercel (`vercel.json`) and/or GitHub Actions → `/api/cron/orchestrate`

## Structure

```
.github/workflows/     news-cron.yml
docs/                  INGESTION.md
src/app/api/           fetch-news, health
src/app/admin/         ingestion dashboard
src/lib/news/          providers, pipeline, AI
supabase/migrations/
```

## Concept notes

- Sample editorial copy remains reimagined placeholders
- `robots: noindex` on concept build
