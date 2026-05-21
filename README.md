# CG Bhaskar — Concept Redesign

**Speculative premium redesign** for presentation and pitching purposes only.  
Not affiliated with CG Bhaskar. Not an official product.

## Experience

- Production-ready regional news platform (Next.js App Router)
- Mobile-first reading experience
- Live wire from NewsAPI + Supabase
- Static editorial desk content (Chhattisgarh concept stories)
- Multilingual UI (English, Hindi, Chhattisgarhi)

## Stack

- Next.js 16 · TypeScript · Tailwind CSS v4
- Supabase (PostgreSQL)
- NewsAPI
- Vercel (frontend hosting)
- GitHub Actions (free scheduled ingestion)

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Local ingestion test (no GitHub/Vercel cron):

```bash
curl "http://localhost:3000/api/fetch-news?dev=1"
```

## Automated News Pipeline

### Architecture

```
GitHub Actions (every 30 min)
        │
        ▼  Authorization: Bearer CRON_SECRET
Vercel  /api/fetch-news
        │
        ├── NewsAPI (business, technology, sports, entertainment, health)
        │
        ▼
Supabase  news_articles  (unique: article_url)
        │
        ▼
Next.js homepage (Server Components, ISR 5 min)
        └── Hero, categories, latest grid → /article/[id]
```

1. **GitHub Actions** — `.github/workflows/news-cron.yml` runs on a cron schedule and can be triggered manually (`workflow_dispatch`). Free on public repos.
2. **Ingestion API** — `src/app/api/fetch-news/route.ts` fetches headlines, validates them, and upserts into Supabase. Duplicates are skipped via `article_url` unique constraint.
3. **Supabase** — `news_articles` table stores title, description, content, image, source, author, category, `article_url`, `published_at`.
4. **Vercel frontend** — `app/page.tsx` reads the latest rows from Supabase and renders the live wire. Editorial sections below remain static concept content.

### Database setup

Run once in Supabase SQL Editor:

`supabase/migrations/001_news_articles.sql`

### Environment variables (Vercel)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; ingestion upserts |
| `NEWS_API_KEY` | Yes | NewsAPI.org key |
| `CRON_SECRET` | Yes | Bearer token for `/api/fetch-news` |

### GitHub repository secrets

| Secret | Required | Notes |
|--------|----------|-------|
| `CRON_SECRET` | Yes | **Must match** the value in Vercel |

Add under: **Repository → Settings → Secrets and variables → Actions → New repository secret**

### Workflow testing

**Manual run (recommended after setup):**

1. Add `CRON_SECRET` to GitHub Actions secrets.
2. Go to **Actions → News ingestion cron → Run workflow**.
3. Check the job log for `HTTP status: 200` and `"ok": true`.

**Verify API directly:**

```bash
curl -sS -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://newspaper-motion.vercel.app/api/fetch-news"
```

Expected:

```json
{ "ok": true, "inserted": 0, "totalFetched": 42, ... }
```

**Schedule:** every 30 minutes (`*/30 * * * *` UTC).

> Remove `ALLOW_DEV_FETCH` from Vercel if previously set — ingestion now uses Bearer auth only.

## Deploy (Vercel)

```bash
npm run build
```

Deploy this directory as the project root.

**Note:** Use only `src/app/` for routes. Do not add a root-level `app/` folder — an empty root `app/` will shadow `src/app/` and break the build.

Recommended Vercel settings:

- Framework Preset: Next.js
- Root Directory: `.` (empty)
- Build Command: `npm run build`

Cron is **not** configured on Vercel; use GitHub Actions instead.

## Structure

```
.github/workflows/   # news-cron.yml — scheduled ingestion
src/
  app/api/fetch-news/  # Ingestion API
  app/article/[id]/    # Live article reader
  lib/                 # supabase, fetchNews, news-db
  sections/live/       # Live wire homepage sections
supabase/migrations/   # news_articles schema
```

## Concept notes

- Sample headlines and Hindi/English editorial copy are **reimagined placeholders**
- Images via Unsplash + NewsAPI publisher URLs
- `robots: noindex` on concept build — remove in production pitch fork if indexing is desired
