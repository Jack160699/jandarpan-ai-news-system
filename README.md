# Jan Darpan Chhattisgarh

**जन दर्पण छत्तीसगढ़** — premium regional digital news for Chhattisgarh.  
Independent identity; not affiliated with any national daily publisher.

## Experience

- Production-ready regional news platform (Next.js App Router)
- Mobile-first reading experience
- **Hybrid live wire** — GNews + NewsData.io + Chhattisgarh RSS → Supabase
- Static editorial desk content (concept stories)
- Multilingual UI (English, Hindi, Chhattisgarhi, Marathi, Bengali, Tamil)

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
        └── RSS (Chhattisgarh regional sources)
        │
        ▼
Supabase  news_articles + ingestion_logs
        │
        ▼
Next.js homepage (Server Components) → /story/[slug]
```

See **[docs/INGESTION.md](docs/INGESTION.md)** for full folder structure, migrations, and hardening notes.

### Environment variables (Vercel)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only upserts |
| `GNEWS_API_KEY` | Recommended | [gnews.io](https://gnews.io) — India headlines |
| `NEWSDATA_API_KEY` | Recommended | [newsdata.io](https://newsdata.io) — global + Hindi |
| `CRON_SECRET` | Yes | Bearer token for `/api/cron/*` |
| `NEWSROOM_DEFAULT_TENANT` | Optional | Default: `jan-darpan-chhattisgarh` |
| `OPENAI_API_KEY` | Optional | AI summaries / headlines |

## Brand

- **English:** Jan Darpan Chhattisgarh  
- **Hindi:** जन दर्पण छत्तीसगढ़  
- **Short label:** Jan Darpan / जन दर्पण  
- **Logo:** `public/brand/jan-darpan-chhattisgarh-logo.png`
