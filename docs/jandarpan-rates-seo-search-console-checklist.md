# Rates SEO — Search Console readiness checklist

**Date:** 2026-07-21
**Note:** This checklist prepares URL Inspection readiness. It does **not** guarantee indexing, rankings, or backlinks.

## Per indexable rate URL

- [ ] HTTP 200 on Preview
- [ ] Server-rendered H1 + current status + history table in HTML
- [ ] Unique Hindi-first title/description via `buildPageMetadata`
- [ ] Canonical absolute URL
- [ ] Robots allow index on public rate pages (not admin/api)
- [ ] BreadcrumbList JSON-LD validates
- [ ] WebPage JSON-LD present
- [ ] Dataset JSON-LD **only** when ≥7 verified points + date coverage
- [ ] No “official” / “live” claims
- [ ] Internal links to hub, methodology, related cities/categories
- [ ] Mobile viewport: no horizontal overflow
- [ ] Core Web Vitals posture: SSR facts + lightweight SVG graph hydration

## Sitemap

- [ ] `/sitemap-rates.xml` lists only supported routes
- [ ] Excludes `/admin`, `/api`, unsupported cities
- [ ] `lastmod` from latest verified snapshot or content epoch — not regenerate noise
- [ ] Listed in `robots.ts`

## Unavailable / history states

- [ ] Current unavailable copy visible
- [ ] Prior history (if any) keeps original dates
- [ ] Never shows prior value as “today”
- [ ] Empty graph shell not shown for 0 points

## External limits

Fuel ULIP + IBJA display consent still required before numeric “available” states can become COMPLETE.
