# Production Recovery — Deployment Record (Phase 9)

## Rollback reference

- Branch/tag: `backup/production-recovery-before-final-deploy`
- SHA: `33d1cb1896962bfe1aa70544d97849802b3d4245`
- Previous production deployment: `dpl_5B5X5nPnkHxy5jhu2Fu7nNdqrNvV`

## Push

- Remote: `origin` (`Jack160699/newspaper-motion` → `jandarpan-ai-news-system`)
- Branch: `main`
- Force-push: **no**
- Range pushed: `33d1cb1..d05e36e` (Phases 1–6 + 8 code), then Phase 9 docs/integration commit

## Production deployment

| Field | Value |
|---|---|
| Deployment ID | `dpl_GYNpQTcA9UzapXTGeQbd4KjeMDPZ` |
| Ready state | **READY** |
| Target | production |
| Commit SHA | `d05e36ebc5145487f93fd77f2f7aa745a6eced8a` |
| Release log marker | `jan-darpan@d05e36ebc514` |

## Aliases confirmed

- https://www.jandarpan.news
- https://jandarpan.news
- https://newspaper-motion.vercel.app
- https://newspaper-motion-jack160699s-projects.vercel.app
- https://newspaper-motion-git-main-jack160699s-projects.vercel.app

## Migrations applied in Phase 9

| Migration | Status |
|---|---|
| `064` / `generated_pool_query_indexes` (`idx_generated_articles_public_published_at`, `idx_generated_articles_pending_created_at`) | Applied to production (`giiuqshoconjbpiueasp`) |

## Scheduler changes (from Phases 2/8, live on this deploy)

| Path | Schedule | Role |
|---|---|---|
| `/api/fetch-news` | `7,37 * * * *` | Ingestion |
| `/api/cron/editorial-generate` | `5,20,35,50 * * * *` | Dedicated generation worker |
| `/api/cron/orchestrate` | `15,45 * * * *` | Non-generation orchestrator |
| `/api/cron/translation-backfill` | `20 */6 * * *` | Translation backfill |
| `/api/cron/workers/health` | `0 * * * *` | Health ping |
| Competitor / SEO / SERP / GSC / cleanup / edition-publish | unchanged patterns | Bounded / hardened |

## Post-deploy probes

| Probe | Result |
|---|---|
| Homepage | HTTP 200 (~5.5–6.4s cold) |
| Sitemap | HTTP 200 (~5.1–6.1s); pool ~400 rows in 505–651ms |
| `/api/health` | HTTP 200 shallow `{ok:true,status:"healthy"}` (not full admin score) |
| Generated pool (homepage) | 505–1752ms; **no new 57014 on this deployment** |
