# Jan Darpan — Production Release Candidate

**Status:** Release Candidate (RC) — **not merged · not promoted to Production**  
**Date:** 2026-07-20  
**Feature branch:** `feat/jandarpan-reader-design-system`  
**RC HEAD:** `e92f34d` (Phase 8 cleanup + this document)  
**Merge base with `main`:** `33d1cb1`  
**Commits ahead of `main`:** 18 (Phases 1–7 + Phase 8 RC)

> This document prepares a production-ready candidate for the navy/red/gold
> public reader redesign. It does **not** authorize merge to `main` or a
> Production deploy. Sign-off + explicit human go-live are required next.

---

## 1. Branches

| Branch | Role |
|--------|------|
| `feat/jandarpan-reader-design-system` | **Release candidate** — all Phases 1–8 work |
| `main` | Untouched production line (do not merge yet) |
| `rollback/reader-design-20260719` | Pre-feature safety tip → `33d1cb1` |

**Remote:** `origin` → GitHub `Jack160699/jandarpan-ai-news-system` (legacy remote name `newspaper-motion` still accepted).

---

## 2. Commits (feature branch vs `main`)

| SHA | Summary |
|-----|---------|
| `1275475` | Phase 1 — DS foundation (flag-gated) |
| `2f867ff` | Phase 1 final report |
| `eca51fb` | Phase 1 Preview READY evidence |
| `39fac46` | A1 visual correction |
| `67b49e7` | Visual-correction smoke evidence |
| `563d36a` | Phase 2 discovery screens |
| `f51362f` | Phase 2 visual audit completion |
| `5e461a2` | Phase 3 article templates |
| `b4788e0` | Phase 3 TypeScript fixes |
| `ab4416c` | Phase 4 audio + personalization |
| `080dbb2` | Phase 4 Preview URL |
| `7527abf` | Phase 5 monetization |
| `3a9fe7b` | Phase 5 Preview URL |
| `7fcb377` | Phase 6 tablet/desktop grid |
| `8002225` | Phase 6 Preview URL |
| `726b8ca` | Phase 7 system states + product polish |
| `7fdcefb` | Phase 7 Preview URL |
| `e92f34d` | Phase 8 — RC cleanup + production release doc |

---

## 3. Preview URL

| Item | Value |
|------|-------|
| Phase 7 / current Preview | https://newspaper-motion-faumlh45l-jack160699s-projects.vercel.app |
| Stable branch alias | https://newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app |
| Inspector (Phase 7) | https://vercel.com/jack160699s-projects/newspaper-motion/A4QKFusqv56Az7nnY3KqKqV6Qzdp |
| Project | `newspaper-motion` (`prj_kJbD8R5jMyugTUpK4V95ZqhMI0YZ`) |
| Team | `team_UWCzHaOLdAOtezWqRxYNxdYf` |

**Preview env:** `NEXT_PUBLIC_READER_DS=1` (branch-scoped).  
**Production env:** leave `NEXT_PUBLIC_READER_DS` **unset / `0`** until go-live.

QA gallery (Preview only): `/system/preview?state=…` · paywall QA: `/membership/paywall-preview`  
Both are blocked when `VERCEL_ENV=production` via `isReaderDesignSystemQaEnabled()`.

---

## 4. Feature flag

| Concern | Detail |
|---------|--------|
| Flag | `NEXT_PUBLIC_READER_DS` |
| ON | `=== "1"` → reader DS UI |
| OFF (default) | Legacy reader 100% unchanged |
| Code | `src/features/reader-ds/config.ts` → `isReaderDesignSystemEnabled()` |
| QA gate | `isReaderDesignSystemQaEnabled()` — DS on **and** `VERCEL_ENV !== "production"` |
| Kill switch | Unset Production env → instant rollback to legacy UI (no redeploy of code required if flag was the only Production change) |

---

## 5. Changed routes

### 5.1 Swap to DS when flag ON

| Route | DS surface |
|-------|------------|
| `/` | `ReaderHomepage` |
| `/district`, `/district/[slug]` | District selector / hub |
| `/category/[slug]` | Category hub |
| `/latest`, `/trending` | Chrono / ranked feeds |
| `/search` | Search landing + results |
| `/topics/[slug]` | Topic hub |
| `/live`, `/live/[slug]` | Live news |
| `/story/[slug]` | Article templates (B11–B20 family) |
| `/premium/[slug]` | Premium + paywall |
| `/listen` (+ queue/downloads) | Audio briefing |
| `/archive` (+ saved/history/followed/notifications/language/districts/accessibility) | Profile / prefs |
| `/membership` (+ plans/checkout/success/failure/manage) | Membership shell |

### 5.2 Global boundaries (flag ON)

| File | Behavior |
|------|----------|
| `src/app/loading.tsx` | F46 skeleton |
| `src/app/error.tsx` | F48 Hindi error |
| `src/app/not-found.tsx` | F54 editorial 404 |
| `src/app/maintenance/page.tsx` | F53 maintenance |
| `AppChrome` | Skips legacy chrome on DS routes |

### 5.3 Redirect helpers (flag ON)

| From | To |
|------|-----|
| `/saved` | `/archive/saved` |
| `/notifications` | `/archive/notifications` |

### 5.4 Preview-only QA (blocked on Vercel Production)

| Route | Purpose |
|-------|---------|
| `/system/preview` | Group F gallery |
| `/membership/paywall-preview` | Paywall design QA |

---

## 6. Implemented components (inventory)

### Shell & atoms — `src/features/reader-ds/components/`

`JdIcon`, `ArticleImage`, `Tag`, `SectionHeader`, `AiSummary`, `ActionRow`, `Masthead`, `UtilityRow`, `BreakingStrip`, `LeadStory`, `SecondaryStory`, `ChronoStory`, `TrendingRankRow`, `Ad`, `DismissibleAd`, `UtilTiles`, `ChipRow`, `BottomNav`, `DesktopPrimaryNav`, `ReaderShell`, `SearchOverlay`, `DistrictSelector`, `DistrictContextBar`, `LatestRefreshBar`, `MastheadSearchButton`

### System states — `src/features/reader-ds/system/`

`LoadingSkeleton`, `EmptyState`, `StateBody`, `ErrorStatePage`, `NotFoundStatePage`, `MaintenancePage`, `NetworkGuards`, `PermissionSheet`, `ForceNetworkDemo` (QA)

### Experience — `src/features/reader-ds/experience/`

Audio: `AudioProvider`, `MiniPlayer`, `FullPlayer`, listen/queue/downloads pages  
Prefs: language, accessibility, districts, notifications, followed, saved, history, profile hub

### Monetization — `src/features/reader-ds/monetization/`

Membership landing/plans/checkout/success/failure/manage, paywall, native sponsored card, inline ads, premium strip

### Pages / article / homepage

`ReaderHomepage`, discovery pages (district/category/latest/trending/search/topic/live), `ReaderArticlePage` + live-blog/premium report variants

### Styles

`styles/tokens.css`, `styles/responsive.css` (tablet ≥768 · desktop ≥1024 · wide ≥1280)

### Removed in Phase 8 RC cleanup

- Dead `AudioBriefingCta` (unused after A1 correction)
- Duplicate approved HTML copies under `docs/jandarpan-reader-redesign/` (canonical: `public/design-refs/phase-{2,3}/`)

---

## 7. Screenshots

| Phase | Audit | Screenshots | Approved refs |
|-------|-------|-------------|---------------|
| 1 | `docs/jandarpan-reader-redesign-visual-audit.md` | `docs/jandarpan-reader-redesign/screenshots/` (+ `visual-correction/`) | `public/design-refs/approved-a1-homepage.html` |
| 2 | `…-phase-2-visual-audit.md` | `…/screenshots/phase-2/` | `public/design-refs/phase-2/` |
| 3 | `…-phase-3-visual-audit.md` | `…/screenshots/phase-3/` | `public/design-refs/phase-3/` |
| 4 | `…-phase-4-visual-audit.md` | `…/screenshots/phase-4/` | `public/design-refs/phase-4/` |
| 5 | `…-phase-5-visual-audit.md` | `…/screenshots/phase-5/` | `public/design-refs/phase-5/` |
| 6 | `…-phase-6-visual-audit.md` | `…/screenshots/phase-6/` | `public/design-refs/phase-6/` |
| 7 | `…-phase-7-visual-audit.md` | `…/screenshots/phase-7/` | `public/design-refs/phase-7/` |
| Remaining | `…-phase-7-remaining-issues.md` | — | Minor non-blockers |

Capture scripts: `scripts/capture-phase-{2–7}-screens.mjs`

---

## 8. Tests

| Suite | Command | RC result |
|-------|---------|-----------|
| Typecheck | `npm run typecheck` | Pass |
| Unit | `npm test` | Pass (includes `reader-ds/config.test.ts`) |
| Build (flag ON) | `NEXT_PUBLIC_READER_DS=1 npm run build` | Pass (2026-07-20) |
| Reader DS Playwright | `npm run test:reader-ds` | Pass (8/8 — Phase 7) |
| A11y gates | `npm run test:a11y` | Pass (landmarks, nav names, dialog, retry) |
| Full-repo lint | `npm run lint` | Prefer scoped paths (worktrees can hang) |

---

## 9. Verification matrix (RC)

### 9.1 Bundle size

| Check | Result |
|-------|--------|
| Production build with `NEXT_PUBLIC_READER_DS=1` | **Pass** — compiles; DS routes present (`/`, `/story/[slug]`, `/membership/*`, `/system/preview`, `/maintenance`, …) |
| Bundle analyzer script | **Not present** — recommend `@next/bundle-analyzer` as a post-RC follow-up; no size regression gate automated yet |
| Middleware | Present (`ƒ Proxy`) |

### 9.2 Image optimization

| Check | Result |
|-------|--------|
| DS `ArticleImage` | CDN rewrite via `optimizeCdnUrl` (`src/lib/news/images/cdn.ts`); native `<img>` + data-saving hide; scene fallbacks |
| Legacy homepage cards | `next/image` via `JdsCardImage` |
| `next.config` `images.remotePatterns` | **Not configured** — follow-up before wide CDN hosts; DS path does not depend on Next Image optimizer |
| `sharp` dependency | Present |

### 9.3 Caching / ISR

| Surface | Policy |
|---------|--------|
| Homepage / story / latest / search / listen / live / district / category | `revalidate = 60` |
| Topics | `revalidate = 300` |
| `sitemap.xml` | `revalidate = 3600` (route also `force-dynamic`) |
| `news-sitemap.xml` | `revalidate = 300` + Cache-Control |
| `feed.xml` | `revalidate = 3600` |
| Tunables | `HOMEPAGE_CACHE_SECONDS`, `API_EDGE_CACHE_SECONDS` (`docs/ENVIRONMENT.md`) |
| Edge helpers | `src/lib/infrastructure/cache/edge.ts` |
| Security headers | Middleware → `src/lib/security/headers.ts` (not Cache-Control) |

### 9.4 SEO / robots / sitemap / metadata

| Asset | Location | RC status |
|-------|----------|-----------|
| Root metadata | `src/app/layout.tsx` + `src/lib/tenant/metadata.ts` | Verified present |
| Page builders | `src/lib/seo/metadata.ts` | Home/category/hub/utility |
| JSON-LD | `src/lib/seo/json-ld.ts` + story helpers | Organization / website / article / homepage |
| `robots.txt` | `src/app/robots.ts` | Allow `/`; disallow admin/debug/dashboard/api + **`/system/`** + **`/membership/paywall-preview`** (Phase 8) |
| `sitemap.xml` | `src/app/sitemap.ts` → `buildMainSitemap` | Present |
| `news-sitemap.xml` | `src/app/news-sitemap.xml/route.ts` | Present |
| Canonical / OG | Tenant `metadataBase` + per-route `generateMetadata` | Present |

### 9.5 Production environment variables

Canonical list: `docs/ENVIRONMENT.md`. RC must confirm in Vercel Production (values not stored in git):

**Required**

- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `CRON_SECRET`
- [ ] `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` (if QStash primary)

**Reader DS go-live (only when authorized)**

- [ ] `NEXT_PUBLIC_READER_DS=1` on Production — **do not set until go-live**
- [ ] Confirm Preview remains `1` on feature branch

**Observability / optional**

- [ ] `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Phoenix V3 flags only as intentionally enabled today

### 9.6 Vercel configuration

| Item | Status |
|------|--------|
| `vercel.json` | Crons only (fetch-news, orchestrate, edition-publish, workers/health, translation-backfill, cleanup, competitor/SEO/SERP/GSC/autonomous) |
| Framework | Next.js (auto) |
| Project link | `.vercel/project.json` (local, gitignored) |
| Production promote | **Not performed for this RC** |

### 9.7 Supabase integrations

| Client | File |
|--------|------|
| Browser | `src/lib/supabase/client.ts` |
| Server / cookies | `src/lib/supabase/server.ts` |
| Admin | `src/lib/supabase/admin.ts` |
| Middleware session | `src/lib/supabase/middleware.ts` |
| Env validation | `src/lib/supabase/env.ts` |

Reader DS consumes existing feeds/monetization/reading-memory — **no new migrations** in Phases 1–8.

### 9.8 Publishing pipeline

| Entry | Path / schedule |
|-------|-----------------|
| Ingest | `/api/fetch-news` — `7,37 * * * *` |
| Orchestrate | `/api/cron/orchestrate` — `15,45 * * * *` |
| Edition publish | `/api/cron/edition-publish` — `30 0,3,6,9,12,15 * * *` |
| Workers health | `/api/cron/workers/health` — hourly |
| Registry | `src/lib/infrastructure/cron/registered-jobs.ts` |
| Auth | `CRON_SECRET` + QStash signatures (`src/lib/infrastructure/auth/cron-auth.ts`) |
| Docs | `docs/QSTASH_SCHEDULER_SETUP.md`, `docs/INGESTION.md` |

**RC note:** Reader redesign does not alter cron contracts.

### 9.9 Admin

| Gate | Mechanism |
|------|-----------|
| Middleware | Unauthenticated `/admin/*` → login; session refresh |
| Layout | `getUser` + `getDashboardSession` + path RBAC |
| Robots | Admin `NOINDEX` |
| RBAC | `src/lib/newsroom-auth/rbac.ts`, `src/lib/security/middleware-rbac.ts` |

**RC note:** Admin UI unchanged by reader DS; no admin routes rewritten.

### 9.10 Analytics

| System | Status |
|--------|--------|
| First-party collector | `useAnalyticsCollector` → `/api/analytics/events` |
| Admin analytics | `/admin/analytics` (`NEXT_PUBLIC_ANALYTICS_V3`) |
| Marketing tags (GTM/Plausible) | Not present |
| Sentry | `@sentry/nextjs` configs + `src/lib/observability/sentry.ts` |

---

## 10. Rollback instructions

### A. Before Production flag enable (current RC state)

1. Do nothing on Production — flag remains off → legacy UI.
2. Preview can be ignored or branch deleted after sign-off rejection.

### B. Instant UI rollback (if Production flag was set)

1. Vercel → Project → Settings → Environment Variables → Production  
2. Remove `NEXT_PUBLIC_READER_DS` or set to `0`  
3. Redeploy Production (or wait for next deploy)  
4. Confirm `/` renders legacy shell (no `.jd-ds`)

### C. Git rollback (if merged by mistake)

```text
# Preferred: revert the merge commit on main
git checkout main
git pull
git revert -m 1 <merge-commit-sha>
git push origin main

# Emergency tip to pre-feature main (only with explicit approval)
# rollback/reader-design-20260719 → 33d1cb1
```

### D. Vercel Instant Rollback

Dashboard → Deployments → prior Production READY deployment → **Promote to Production**.

### E. Data / payments

- Checkout intentionally not live (`checkout-not-live`) — **Razorpay checkout blocker remains deferred and open.**
- No payment implementation was performed in the A1 weather/market utilities pass.
- Production `NEXT_PUBLIC_READER_DS` must remain **unset / `0`**.
- A1 weather: Open-Meteo (no API key). Market tiles: omitted until an honest feed exists — `docs/jandarpan-release-blocker-a1-weather-market.md`.
- No Supabase schema migrations in this feature set.

---

## 11. Production checklist (go-live — future)

**Do not execute until product + eng sign-off.**

### Pre-merge

- [ ] Visual sign-off on Preview (390 / 768 / 1280) against phase audits
- [ ] Confirm Phase 7 remaining issues accepted
- [ ] `NEXT_PUBLIC_READER_DS` **unset** on Production until step “Enable flag”
- [ ] QA routes confirmed blocked on Production (`isReaderDesignSystemQaEnabled`)
- [ ] robots disallow for `/system/` + paywall-preview verified live
- [ ] SEO spot-check: home metadata, story JSON-LD, `/sitemap.xml`, `/robots.txt`, `/news-sitemap.xml`
- [ ] ISR smoke: homepage refreshes within ~60s after publish
- [ ] Admin login + editorial queue smoke (unchanged)
- [ ] Cron health green (`/api/cron/workers/health`)
- [ ] Sentry receiving Preview errors (optional)
- [ ] Checkout still fails closed (no live processor)

### Merge (explicit human action)

- [ ] Open PR `feat/jandarpan-reader-design-system` → `main`
- [ ] CI green
- [ ] Merge (no force-push)

### Enable flag (explicit human action)

- [ ] Set Production `NEXT_PUBLIC_READER_DS=1`
- [ ] Production redeploy
- [ ] Smoke: `/`, one `/story/[slug]`, `/listen`, `/membership`, mobile + desktop
- [ ] Confirm ads labeled विज्ञापन / प्रायोजित
- [ ] Confirm offline/slow banners only when network warrants
- [ ] Monitor Sentry + analytics for 24h

### Abort

- [ ] Unset Production flag (Rollback B) or Instant Rollback (D)

---

## 12. Phase 8 RC cleanup performed

| Change | Why |
|--------|-----|
| Removed `AudioBriefingCta` | Dead after A1 correction |
| `isReaderDesignSystemQaEnabled()` | Hard-blocks QA galleries on Vercel Production |
| robots disallow `/system/`, paywall-preview | Keep QA out of indexes |
| Deleted duplicate phase-2/3 HTML under `docs/` | Canonical copies in `public/design-refs/` |
| This document | Single RC source of truth |

---

## 13. Explicit non-actions (this RC)

| Action | Status |
|--------|--------|
| Merge to `main` | **Not done** |
| Production deploy / promote | **Not done** |
| Set Production `NEXT_PUBLIC_READER_DS=1` | **Not done** |
| Live payment processor | **Not enabled** (by design) |
| Fake news / fake brands | **Not introduced** |

---

## 14. Sign-off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Product | | | ☐ Approve RC · ☐ Reject |
| Eng | | | ☐ Approve RC · ☐ Reject |
| Design | | | ☐ Approve RC · ☐ Reject |

**Next step after approval:** open PR → merge → Production checklist §11 (flag enable last).
