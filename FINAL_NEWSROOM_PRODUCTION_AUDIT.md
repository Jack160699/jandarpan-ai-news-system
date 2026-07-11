# FINAL_NEWSROOM_PRODUCTION_AUDIT.md

## 1. Executive Summary

This audit reviewed the **entire repository as-shipped** against the Phase 1–6.7 requirements and the 37-point checklist. The outcome is **NOT production ready today** due to **blocking build/typecheck failures** and a **time-zone schedule mismatch that prevents edition publishing**.

- **Build status (required gate)**: **FAIL** (Next.js build compiles but fails TypeScript check; `npm run typecheck` fails).
- **Critical functional risk**: **Edition publishing can be a no-op** under current QStash cron timing vs IST slot resolver.
- **Security posture**: Middleware enforces session/RBAC for admin/dashboard; cron/ingestion paths are excluded from middleware and instead rely on per-route cron auth (expected).
- **SEO/feeds**: `robots.txt`, `sitemap.xml`, `news-sitemap.xml`, and `feed.xml` exist with sensible caching headers.

## 2. Architecture Overview

High-level pipeline (intended):

- **Ingestion**: QStash hits `POST /api/fetch-news` (twice hourly) → ingest pipeline inserts signals/events and queues AI enrichment/jobs.
- **Orchestration**: QStash hits `POST /api/cron/orchestrate` (twice hourly) → workers process AI enrichment + job queues + downstream tasks.
- **Editorial generation**: Worker `editorial_generate` generates articles from `news_events` and persists rows in `generated_articles` with editorial metadata and workflow status.
- **Edition publishing**: QStash hits `POST /api/cron/edition-publish` at fixed windows → publishes rows with `workflow_status="scheduled"` (Ready For Publish).
- **Breaking override**: High urgency/confidence + trusted sources bypass scheduler and publish immediately.
- **Downstream AI**: Event bus conditionally triggers translations/shorts/embeddings/SEO snapshots based on cost tier.
- **Serving**: Homepage, story, category, district, feeds, and sitemaps read from Supabase with caching layers.

Key control planes:

- **Capacity**: `src/lib/newsroom/editorial-capacity.ts`
- **Edition scheduler**: `src/lib/newsroom/edition-scheduler.ts`, `src/app/api/cron/edition-publish/route.ts`
- **Cost tiers**: `src/lib/newsroom/ai-cost-tiers.ts` and tier gating in `src/lib/infrastructure/events/event-bus.ts`
- **Queue health**: `src/lib/infrastructure/queue/health-manager.ts` with backpressure in ingest and oldest-first job claims
- **Middleware auth & RBAC**: `src/middleware.ts`
- **QStash schedules**: `scripts/setup-qstash-schedules.mjs`

## 3. Everything Changed

Observed recent change themes (from code + diff):

- Hardcoded editorial limits replaced by centralized `EDITORIAL_CAPACITY` and derived `EDITORIAL_LIMITS`.
- Publishing decoupled from generation via `workflow_status="scheduled"` and a separate edition-publish cron.
- Breaking news override added for immediate publishing.
- Ranking redesigned to prioritize regional importance, verified sources, urgency, reader value; penalties for clickbait/duplicates.
- Cost-tier gating added for translations/shorts/embeddings/SEO events.
- Queue health snapshot introduced; ingestion pausing + FIFO job processing when backlogged.
- Executive dashboard UI expanded with capacity/quota/edition/cost KPIs.

## 4. Files Modified By Phase

Based on current `git diff --name-only` in this workspace:

### Phase 6.1 — Editorial Capacity Controller
- `src/lib/newsroom/editorial-capacity.ts` (new)
- `src/lib/infrastructure/config.ts`
- `src/app/api/generate-articles/route.ts`
- `src/lib/newsroom/generated/publish.ts`

### Phase 6.2 — Editorial Edition Scheduler
- `src/lib/newsroom/edition-scheduler.ts` (new)
- `src/app/api/cron/edition-publish/route.ts` (new)
- `src/lib/infrastructure/cron/registered-jobs.ts`
- `scripts/setup-qstash-schedules.mjs`
- `src/lib/news/ai/generate-article.ts` (auto-publish → scheduled)

### Phase 6.3 — Breaking News Override
- `src/lib/news/ai/generate-article.ts` (breaking override publish patch + metadata)

### Phase 6.4 — Editorial Ranking
- `src/lib/news/ai/ranking.ts`

### Phase 6.5 — AI Cost Optimizer
- `src/lib/newsroom/ai-cost-tiers.ts` (new)
- `src/lib/news/ai/generate-article.ts` (tier plan + downstream gating)
- `src/lib/infrastructure/events/event-bus.ts` (tier-1 gating of translations/shorts/events)

### Phase 6.6 — Queue Health Manager
- `src/lib/infrastructure/queue/health-manager.ts` (new)
- `src/lib/infrastructure/jobs/queue.ts`
- `src/lib/infrastructure/workers/intelligence-workers.ts`
- `src/lib/infrastructure/workers/registry.ts`
- `src/app/api/fetch-news/route.ts`

### Phase 6.7 — Executive Dashboard
- `src/sections/admin/ExecutiveCfoUi.tsx`
- `src/sections/admin/ExecutiveCfoTabs.tsx`

## 5. Verified Improvements (Evidence-Based)

### Homepage / SEO / Feeds / Robots
- **`robots.txt`**: Disallows admin/debug/dashboard/api and advertises both sitemap endpoints. (`src/app/robots.ts`)
- **Main sitemap**: Next metadata sitemap endpoint exists (`src/app/sitemap.ts`) with `revalidate=3600`.
- **Google News sitemap**: `GET /news-sitemap.xml` exists with guarded DB optional behavior + caching headers. (`src/app/news-sitemap.xml/route.ts`)
- **RSS feed**: `GET /feed.xml` exists, uses SITE_URL canonical host, dedupes GUIDs, includes enclosure/media tags, and has CDN-friendly cache headers. (`src/app/feed.xml/route.ts`)

### Middleware Authentication + RBAC
- Middleware applies **security headers**, request-id propagation, tenant routing cookies, Supabase session update when required, and RBAC redirects. (`src/middleware.ts`)
- Cron/ingestion APIs are explicitly excluded from middleware session/RBAC and rely on **per-route cron auth** (expected). (`isIngestionApiPath` in `src/middleware.ts`)

### Editorial Capacity + Edition Scheduling
- `EDITORIAL_CAPACITY` is a single source of truth (daily=40; editions sum=40; breakingUnlimited enabled). (`src/lib/newsroom/editorial-capacity.ts`)
- Edition windows implemented as **IST-slot resolution** and per-slot publish limits that sum to 40/day across 6 windows. (`src/lib/newsroom/edition-scheduler.ts`)

### Cost Tiers + Downstream Gating
- Article generation resolves a tier plan and rejects tier-4; downstream image queue is conditional. (`src/lib/news/ai/generate-article.ts`)
- Event bus gates translations/shorts and “articles.published” fan-out behind tier-1. (`src/lib/infrastructure/events/event-bus.ts`)

### Queue Backpressure + FIFO Recovery
- Ingest worker checks queue health and can skip with reason `queue_backpressure`. (`src/lib/infrastructure/workers/registry.ts`)
- Job claiming can switch to **oldest-first** under backlog (FIFO). (`src/lib/infrastructure/jobs/queue.ts`)

## 6. Remaining Risks (Must-Fix / Should-Fix)

### Critical Issues (block “Production Ready”)

1) **Build/typecheck fails (hard gate)**

`npm run typecheck` errors observed:

- `.next/types/validator.ts`: `"/api/cron/edition-publish"` not assignable to `AppRouteHandlerRoutes`
- `src/app/api/generate-articles/route.ts`: `Type 'number' is not assignable to type '6'` (limit variable inferred as literal)
- `src/lib/homepage/homepage-composition.test.ts`: `sourceTrust` not in `RankingFactorBreakdown` (test out of sync with ranking factors)
- `src/lib/infrastructure/workers/registry.ts`: `skippedWorkerResult` called with too many args (signature is 4–5 args)
- `src/lib/news/ai/ranking.ts`: `EditorialMetadata` typing lacks `local_relevance` and `breaking_override` top-level properties referenced

`npm run build` compiles JS but fails at “Running TypeScript … Failed to type check” with the same `generate-articles` literal-type error.

2) **Edition publish schedule likely never hits IST slot minute==0**

- Scheduler resolves slots using IST time and requires `minute === 0`. (`resolveEditionPublishSlot` in `src/lib/newsroom/edition-scheduler.ts`)
- QStash schedule is defined as `0 6,9,12,15,18,21 * * *` in `scripts/setup-qstash-schedules.mjs`.
- **If QStash cron is evaluated in UTC (typical)**, then `06:00 UTC` is `11:30 IST`, which will always fail `minute !== 0` → return `{ ok: true, reason: "outside_slot_minute" }` and publish **0**.

Impact: **scheduled articles accumulate, never publish**, unless breaking override fires.

### Major Issues (not necessarily blockers if fixed quickly, but high impact)
- **Ranking type drift**: `RankingFactorBreakdown` updated but tests and (likely) downstream consumers still expect legacy factor keys (e.g. `sourceTrust`, `breakingBoost`, `engagement`). (`src/lib/homepage/homepage-composition.test.ts`, `src/lib/news/ai/ranking.ts`)
- **Metadata schema drift in types**: Ranking reads `meta.breaking_override` and `meta.local_relevance`, but `EditorialMetadata` only guarantees `quality_breakdown.local_relevance` and does not define `breaking_override`. (`src/lib/types/newsroom.ts`, `src/lib/news/ai/ranking.ts`)

### Minor Issues / Warnings
- Next.js emits a warning: middleware convention deprecated in favor of “proxy” (does not block but should be tracked). (build output)

## 7. Cost Before vs After

Because this audit is repository-only (no production telemetry attached), costs are computed from **current pipeline logic** with explicit assumptions.

### Assumptions (documented)
- **Published articles/day**: 40 (matches `EDITORIAL_CAPACITY.dailyLimit`)
- **Tier distribution (default assumption)**: Tier1=30%, Tier2=50%, Tier3=15%, Tier4=5% (rejected)
- **Models**:
  - Editorial text model default: `gpt-4o-mini` (`src/lib/news/ai/generate-article.ts`)
  - Image model/provider: via `requestImageGeneration` (provider-selected); exact unit pricing depends on provider/model configuration
- **Translations/embeddings/shorts**: only for **tier-1** (as implemented in event bus)

### “Before” (pre-tiering, pre-gating) — conceptual baseline
- Expected: translations + embeddings + shorts + images for a much larger fraction of articles (often ~100% of published).

### “After” (current implementation)
- **Images/day**: ~published (tiers 1–3 generate image) ≈ \(40 \times 95\% = 38\) images/day
- **Translations/day**: tier-1 only ≈ \(40 \times 30\% = 12\) translation batches/day
- **Embeddings/day**: tier-1 only ≈ 12/day (via `articles.published` fan-out)
- **Shorts/day**: tier-1 only and only when `NEWSROOM_AUTO_SHORTS=true` and OpenAI key present

Net: **downstream AI spend is materially reduced** vs baseline due to tier gating.

## 8. Performance Before vs After

Repository evidence suggests performance work was done earlier (Phase 1–5 “egress optimization”), and current architecture uses:

- CDN caching headers for XML feeds/sitemaps (`s-maxage` + `stale-while-revalidate`).
- Queue workers tuned for deadlines and partial completion.

However, **current typecheck failure prevents deployable builds**, so performance improvements are not presently deliverable to production until the build gate is restored.

## 9. Egress Before vs After

Evidence-based items:

- `feed.xml` uses a bounded pool fetch (`fetchGeneratedArticlePool(100)`) and caches at edge (`s-maxage=3600`). (`src/app/feed.xml/route.ts`)
- `news-sitemap.xml` caches at edge (`s-maxage=300`) and is resilient to DB failures (returns empty urlset). (`src/app/news-sitemap.xml/route.ts`)

Without runtime metrics, only relative statements are possible: the repo shows **clear intent to cap DB reads and leverage CDN caching** on public XML endpoints.

## 10. AI Cost Before vs After

### Daily volume (derived)
- **AI generations/day (editorial text)**: upper bound aligns with capacity: ~40 accepted articles/day (+some tier-4 rejections if attempted).
- **Images/day**: ~38/day (assumption above)
- **Translations/day**: ~12/day
- **Embedding jobs/day**: ~12/day

### Expected OpenAI cost/day and /month (formula-based)

Let:
- \(C_{text}\) = average cost per editorial article generation (prompt+completion)
- \(C_{img}\) = average cost per image generation
- \(C_{tr}\) = average cost per translation batch (per-article, all target languages)
- \(C_{emb}\) = average cost per embedding job (per-article)
- \(C_{short}\) = average cost per shorts generation (if enabled)

Then:
- **Cost/day** ≈ \(40 \cdot C_{text} + 38 \cdot C_{img} + 12 \cdot (C_{tr} + C_{emb} + C_{short})\)
- **Cost/month (30d)** ≈ above × 30

Note: actual \(C_*\) depends on configured model/provider pricing and token budgets (`editorialMaxTokens`).

## 11. Capacity Before vs After

Current configured capacity:

- `EDITORIAL_CAPACITY.dailyLimit = 40`
- Edition capacities: morning 8, noon 6, afternoon 6, evening 10, night 10
- Publish windows: 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 (IST)
- Scheduler splits morning across 06:00 and 09:00:
  - 06:00 → 4
  - 09:00 → 4
  - 12:00 → 6
  - 15:00 → 6
  - 18:00 → 10
  - 21:00 → 10

Calculated outputs:

- **Estimated articles/day**: **40/day** (scheduled publishing capacity) + breaking override spillover
- **Maximum articles/day**: **Unbounded in theory** if breakingUnlimited is true and breaking override conditions are met frequently; **practical maximum** constrained by ingest volume, OpenAI quota, and worker deadlines
- **Average articles/edition (window)**: \(40 / 6 \approx 6.67\)
- **Average per window (actual limits)**: [4, 4, 6, 6, 10, 10]

## 12. Scalability Estimate

This estimate is architecture-based and assumes the build gate is fixed.

- **Reads scale**: dominated by homepage/story/category traffic; mitigated by CDN caching + server-side caching layers (where implemented).
- **Writes scale**: dominated by ingestion inserts + queue tables; bounded by QStash schedule frequency (48/day fetch + 48/day orchestrate) and editorial capacity (40/day).
- **Concurrency**: Worker concurrency is managed via deadline-aware loops and tuning; image worker has its own concurrency tuning.

Expected constraints:
- OpenAI rate limits and per-request timeouts (e.g. 28s editorial timeout) are likely primary throughput limiters.
- Supabase connection pooling and query optimization determine p95 latency for public pages.

## 13. Production Readiness Score (/100)

Scoring rubric: 0–100 based on “must-pass gates” + subsystem grades. **Any hard build gate failure caps readiness.**

### Subsystem grades (0–10 each, weighted into /100)

- **News ingestion**: 7/10 (scheduled, observable, backpressure present; depends on deployability)
- **Editorial**: 7/10 (capacity + tiers + scheduler logic present; scheduler timing mismatch is severe)
- **Homepage**: 7/10 (ranking redesign present; type drift indicates integration risk)
- **District**: 6/10 (not fully verified in this snapshot; assumed stable but unproven without route-level review)
- **SEO**: 8/10 (robots/sitemaps/news-sitemap/RSS present and cached)
- **Performance**: 6/10 (architecture supports performance, but build gate blocks release)
- **Caching**: 7/10 (CDN headers present on XML; broader caching not fully verified)
- **AI**: 7/10 (tiering + logging present; cost model is configurable; build gate blocks)
- **Supabase**: 7/10 (patterns consistent; no schema audit run here)
- **Redis**: 5/10 (usage not fully audited in this pass)
- **Security**: 8/10 (middleware RBAC/session policy is comprehensive; cron excluded as intended)
- **Cron reliability**: 3/10 (**edition-publish schedule mismatch** is critical)
- **Queue reliability**: 7/10 (health snapshot + pausing + FIFO recovery are good)
- **Cost efficiency**: 8/10 (tier gating is a strong improvement)
- **Scalability**: 6/10 (serverless + queues good; depends on fixing scheduler + deployability)
- **Maintainability**: 6/10 (type drift indicates refactor incomplete)
- **Monitoring**: 7/10 (cron run recording + worker metadata exist)
- **Documentation**: 6/10 (present but not re-verified end-to-end here)

### Overall score

**Production Readiness Score: 62/100**

**Cap applied** because: build/typecheck gate is failing and edition publishing is likely non-functional under current cron timing.

## 14. Remaining Recommendations (if any)

No new features recommended—only corrective actions required to meet the already-stated production gates:

- Restore **TypeScript correctness** by resolving the listed type errors (limit literal type widening, ranking factor alignment, metadata typing alignment, `skippedWorkerResult` call signature, and app route handler typing for edition-publish).
- Fix **edition publish scheduling** so cron triggers align with IST slot resolution (either schedule cron in IST-equivalent UTC times or change slot resolver to match cron’s time base).
- Re-run and record: `npm run typecheck`, `npm run build`, `npm test` after fixes (not performed here due to “no code changes” constraint).

## 15. Final Verdict

Production Ready:
NO

Critical Issues Remaining:
2

Major Issues:
2

Minor Issues:
1

Overall Grade:
C

Recommended Deployment:
Do Not Deploy

