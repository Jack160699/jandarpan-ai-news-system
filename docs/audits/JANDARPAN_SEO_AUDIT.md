# Jandarpan SEO Audit (Technical)

**Date:** July 2026  
**Scope:** Technical SEO readiness of the implemented codebase  
**Domain:** https://www.jandarpan.news  
**Language:** Hindi primary, English secondary  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  

---

## 1. Verdict

**Technical SEO scaffolding is present and wired** (robots, main sitemap, Google News sitemap, canonical URL helpers, admin noindex, SEO admin workspace under Business).  

**Live ranking / impression / click performance is out of scope for this document** — see `JANDARPAN_SEO_RESULTS_RECENT.md`. This audit does **not** invent GSC metrics.

---

## 2. Public SEO surfaces (implemented)

| Surface | Implementation | Notes |
|---------|----------------|-------|
| Robots | `src/app/robots.ts` | Allows `/`; disallows `/admin/`, `/dashboard/`, `/api/`, `/debug/`; lists both sitemaps |
| Main sitemap | `src/app/sitemap.ts` → `buildMainSitemap()` | `dynamic = "force-dynamic"`, `revalidate = 3600` |
| News sitemap | `src/app/news-sitemap.xml/route.ts` | Google News XML; empty valid sitemap when no eligible articles |
| Canonical host | `CANONICAL_SITE_URL = https://www.jandarpan.news` | Rejects `vercel.app` / localhost candidates in `resolveCanonicalSiteUrl()` |
| Admin indexing | `src/app/admin/layout.tsx` | `robots: NOINDEX_ROBOTS` |

Sitemap entries cover homepage, utility routes (search, listen, shorts, live), national/international hubs, categories, districts, topics, stories, and live paths (via `src/lib/seo/sitemap-data.ts`). Exact URL counts at runtime depend on database content and were **not** measured live here.

---

## 3. Robots policy (factual)

```text
User-agent: *
Allow: /
Disallow: /admin/, /debug/, /dashboard/, /api/
Sitemap: {SITE_URL}/sitemap.xml
Sitemap: {SITE_URL}/news-sitemap.xml
```

This correctly keeps the command centre and legacy dashboard paths out of the public crawl graph at the robots layer (defense in depth with admin `noindex` metadata).

---

## 4. Google News sitemap behaviour

- Builder helpers: `src/lib/seo/google-news.ts` (spec-aligned news namespace; max 1,000 URLs noted in code).
- Source window: published `generated_articles` within the Google News eligibility window (see `GOOGLE_NEWS_WINDOW_HOURS` / newsroom read helpers).
- On failure: returns a valid empty sitemap with a failure comment rather than crashing the route.

---

## 5. Admin SEO product surfaces (Business workspace)

Defined in `workspaces.ts` under **Business**:

| Route | Label |
|-------|-------|
| `/admin/business` | Business overview |
| `/admin/analytics` | Traffic & audience |
| `/admin/seo/search-console` | SEO (GSC panel) |
| `/admin/seo/rankings` | Rankings |
| `/admin/seo/competitors` | Competitors |
| `/admin/seo/intelligence` | SEO intelligence |
| `/admin/seo/execution` | SEO execution |
| `/admin/seo/autonomous` | Autonomous SEO |

GSC panel UI references configuration flags such as `SEO_GSC_ENGINE=true` and credentials (`GSC_SERVICE_ACCOUNT_JSON` preferred, or `GSC_REFRESH_TOKEN` + Google OAuth). **Presence of those secrets in production was not verified in this session.**

Related scheduled jobs (code + `vercel.json`): `seo-intelligence`, `serp-tracker`, `gsc-intelligence`, `seo-autonomous`, `competitor-tracker`.

---

## 6. Structured data & brand keywords

- JSON-LD helpers live under `src/lib/seo/json-ld.ts` (Organization / WebSite / breadcrumbs patterns).
- Regional keyword defaults include Hindi and English Chhattisgarh/news terms in `src/lib/seo/constants.ts`.
- Brand voice constants: Jan Darpan Chhattisgarh / जन दर्पण छत्तीसगढ़.

---

## 7. Validation utilities in-repo

System validation modules exercise sitemap / news sitemap / robots presence (`src/lib/system-validation/seo-surface.ts`, launch-health helpers). These are **code-level checks**, not substitutes for Google Search Console coverage reports.

---

## 8. Explicit non-claims

This audit does **not** claim:

- Current impression, click, CTR, or average position numbers
- Index coverage % or “pages with issues” counts from GSC
- That autonomous SEO jobs are currently succeeding in production

Those require live credentials and Google API responses.

---

## 9. Related documents

- `JANDARPAN_SEO_RESULTS_RECENT.md` — results posture for this session  
- `JANDARPAN_PIPELINE_AUDIT.md` — SEO cron jobs in the scheduler set  
- `JANDARPAN_REMAINING_BLOCKERS.md` — GSC credential blocker  
