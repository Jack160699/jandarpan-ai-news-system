# Incident & Deployment Timeline (IST)

## Production baseline
- **Current `main` SHA:** `33d1cb1896962bfe1aa70544d97849802b3d4245`
- **Current production deployment:** `dpl_5B5X5nPnkHxy5jhu2Fu7nNdqrNvV` (commit `33d1cb1`, "docs(admin): record Phase 6 production deploy verification"), state **READY**, created **2026-07-19 16:15 IST** (10:45 UTC).
- **Repo/host:** GitHub `Jack160699/jandarpan-ai-news-system` → Vercel `newspaper-motion`.

## Deployment timeline (production target, IST)

| Time (IST) | SHA | Commit | Touches |
|---|---|---|---|
| **Jul 15 ~13:00–23:36** | e98372a & phase-9c2 series | image-matching / mobile UX fixes | last prod deploys **before** the freeze |
| — *(no production deploys Jul 16, Jul 17, Jul 18 daytime — ~3-day freeze on `e98372a`)* — | | | |
| Jul 19 04:37 | 9eeb503 | "complete jandarpan stability seo auth and premium admin overhaul" | seo, auth, admin, stability (broad) |
| Jul 19 04:42 | 91ad008 | "never return 500 from Google News sitemap" | **sitemaps** |
| Jul 19 05:29 | 004c363 | Merge PR#31 premium admin | admin |
| Jul 19 05:30 | 12e2801 | brand mark fix | admin UI |
| Jul 19 06:15 | db0e905 | "rebuild Jan Darpan Admin V3 product system" | **admin reporting / health UI** |
| Jul 19 06:21 | 04bb322 | docs | — |
| Jul 19 06:53 | 2c23c68 | "close Admin V3 editorial status … stop false cron/sitemap/translation alerts; unify canonical production status" | **health classification** |
| Jul 19 11:03 | dc2d9e3 | merge admin V3 | admin |
| Jul 19 11:15 | 9afa0d8 | "perf(home): statically import V3 homepage body" | homepage rendering |
| Jul 19 12:02 | 52f13cb | responsive owner dashboard | admin UI |
| Jul 19 12:12 | 25b35f2 | compact admin login | admin UI |
| Jul 19 12:14 | 600b1ee | mobile login | admin UI |
| Jul 19 12:42 | 60cd89d | "Admin V3 performance settings" | admin |
| Jul 19 16:09 | efe2d6b | "Admin V3 stabilization and premium finish" | admin |
| **Jul 19 16:15** | **33d1cb1** | Phase 6 deploy verification | **current prod** |

**Correlation:** ~15 production deploys occurred on **Jul 19** (04:37–16:15). **None changed** the ingestion provider logic, the `fetch-news` route, the `run-guard` `ok` rule, or the worker/queue engine. So the two core problems (fetch-news false-fail; generation starvation) are **not deploy-induced** — they persisted across the frozen `e98372a` deployment (all of Jul 16–18) and through the Jul-19 burst. The Jul-19 changes were mostly **admin/health UI + SEO + auth + sitemap-hardening**, and health-alert wording (`2c23c68`) — but the alert *trigger* (`fetch-news ok=false`) remains.

## Chronological incident timeline

| Time (IST) | Subsystem | Event | Trigger | User-visible | Business effect | Duration | Status | RC confidence |
|---|---|---|---|---|---|---|---|---|
| Jul 12–15 (pre-window) | DB/egress | Supabase `exceed_egress_quota` restriction | egress quota exceeded on old deploy | site read errors, ingest upsert failures | major (pre-window) | ~3 days | **Resolved by ~Jul 15–16** | high |
| Jul 16 17:38 → ongoing | ingestion/health | `fetch-news` recording `ok=false` (`ingest_worker_failed`) despite inserts | dead RSS soft-error → run-guard `failed>0` | "Critical / 28 / F / Cron failed: fetch-news" | none on data | continuous | **ACTIVE** | high |
| Jul 17 10:46 → ongoing | workers | generation-feeding jobs (`embed/cluster/snapshot`) backlog via `job_timeout` | orchestrate 110s budget | few new stories | 2–4 articles/day | continuous | **ACTIVE** | high |
| ~Jul 9 → ongoing | translation | `translate_article` 100% fail (`urgencyScore is not defined`) | code bug | missing translations | coverage ~6.6% | >10 days | **ACTIVE** | high |
| Jul 18 (day) | cron | `workers-health` cron begins failing (13 fails) | worker backlog/timeouts | health noise | monitoring | — | ACTIVE | medium |
| Jul 18 23:07 → Jul 19 16:15 | deploy | 18 production deploys (stability/SEO/Admin V3) | release push | admin rebuilt, homepage perf | health reporting reworked; core pipeline unchanged | ~11h | Completed | high |
| Jul 19 05:31–11:31 | SEO | 10 SEO actions executed | seo-autonomous/execution | — | SEO changes applied (impact pending) | — | Completed | high |
| Jul 19 06:00–07:20 | DB/API | statement timeouts (57014) on admin health + generated-pool | slow generated-pool query | admin dashboards slow/errored | admin visibility | ~1h20m | Likely resolved | medium |
| Jul 19 06:30 | cron | competitor-tracker 120s function timeout | long crawl | none | — | recurring | Degraded | medium |
| Jul 19 07:32–08:11 | admin auth | Invalid Refresh Token errors | session refresh | admin re-auth | minor | ~40m | Resolved | medium |
| daily | provider | GNews HTTP 403 daily quota (reset 00:00 UTC) | optional provider limit | none (fallback covers) | GNews ~144/day then stops | recurring | Expected/handled | high |
| across window | provider | 8/18 RSS sources dead (auto-disabled) | source unavailability | slightly less diversity | minor + triggers the false-critical | continuous | Auto-managed | high |
| Jul 17 | SEO/index | sitemap health error→healthy | egress recovery + sitemap 500-guard | — | indexability improved | — | Recovered | high |

Machine-readable version: `data/incidents_last_3_days.csv`.
