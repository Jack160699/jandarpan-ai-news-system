# Jan Darpan — SEO & discoverability quality gate

**Status:** Mandatory release requirement (platform-wide)
**Date captured:** 2026-07-21
**Cursor rule:** `.cursor/rules/seo-quality-gate.mdc` (always apply)

SEO is not a separate feature. Every route, page, template, and API-backed surface must pass SEO validation before the feature is marked **COMPLETE**.

Related audits: `docs/audits/JANDARPAN_SEO_AUDIT.md`, `docs/audits/JANDARPAN_SEO_RESULTS_RECENT.md`
Implementation helpers: `src/lib/seo/metadata.ts`, `src/lib/seo/json-ld.ts`, `src/lib/seo/sitemap-data.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`

---

## 1. Review dimensions (every new page)

| Dimension | Expectation |
|-----------|-------------|
| Technical SEO | Crawlable HTML, HTTP 200 for indexables, correct robots |
| On-page SEO | Unique title/description, one primary intent, clear H1 |
| Semantic / entity SEO | Real entities (district, category, org, author) in copy + JSON-LD |
| Internal linking | Contextual links; no orphans |
| Discoverability | Linked from hubs; sitemap when indexable |
| Indexing | Canonical + robots aligned with intent |
| Structured data | Valid JSON-LD for page type |
| Core Web Vitals | LCP &lt; 2.5s · INP &lt; 200ms · CLS &lt; 0.1 |
| Accessibility | Semantics, labels, alt text, keyboard |
| Multilingual | Hindi-first; hreflang; no mixed-language metadata |
| Mobile-first | Readable without desk-only chrome |

---

## 2. Page requirements

Where appropriate, every page includes:

- Unique **title** and **meta description** (never duplicates across URLs)
- **Canonical** URL
- **Open Graph** + **Twitter Card**
- **Robots** directives (index vs noindex intentional)
- **Breadcrumbs** (UI + BreadcrumbList JSON-LD when public)
- Proper **heading hierarchy** (single H1)
- **Semantic HTML**
- Descriptive **image alt**; optimized sizes; **lazy** by default; preload only when justified
- **JSON-LD** when it matches the page (Article, NewsArticle, FAQPage, WebSite, Organization, BreadcrumbList, etc.)
- **Internal links** + related content
- **FAQ** only when it genuinely helps users
- Human-readable URLs
- **Sitemap** inclusion + accurate **lastmod** for indexables
- Correct **hreflang** when multiple languages exist

Use `buildPageMetadata` / `buildUtilityPageMetadata` from `src/lib/seo/metadata.ts` — do not hand-roll conflicting tags.

---

## 3. Content requirements

- Users first; one primary intent per page
- No keyword stuffing, hidden keywords, doorway pages, thin auto-pages, filler, or duplicated paragraphs
- Every page must contain useful unique information

---

## 4. Programmatic SEO

For districts, cities, categories, rates, and similar generated surfaces:

- Generate **only** when meaningful content exists
- Each page: unique title, description, intro, FAQ (if useful), related links, structured data, breadcrumbs
- Never generate thousands of empty pages

---

## 5. Internal linking map (examples)

Connect when contextually real:

Story → Category → District → Topic → Related story → Market rates → Weather → Election → Live → Author → Tags

Important pages must be reachable without depending solely on the sitemap.

---

## 6. Backlink readiness

Prefer citation-worthy pages: original datasets, local stats, explainers, comparisons, timelines, archives, calculators, visualizations, election/mandi/weather dashboards, verified rates, district profiles.

Do **not** artificially manufacture backlinks.

---

## 7. Google Search Console posture (indexables)

Target for public pages:

- HTTP 200, crawlable, indexable
- Canonical set and consistent
- Mobile friendly; CWV within targets
- Structured data + breadcrumbs valid
- Sitemap included; internal links present
- No duplicate metadata

Account, offline-device, and QA utilities may be **noindex** by design — still require unique metadata and correct robots.

**Do not** add `/admin`, `/api`, `/dashboard`, `/debug`, or other non-public surfaces to the public sitemap. Those routes stay disallowed / noindex via existing `src/app/robots.ts` and layout metadata. Sitemap inclusion applies only to intentionally indexable editorial/utility URLs.

This quality gate does **not** guarantee backlinks, rankings, impressions, or Search Console outcomes.

---

## 8. Performance

- Prefer **Server Components**
- Prefer **SSR / ISR** when appropriate
- Avoid unnecessary client JavaScript

---

## 9. Multilingual SEO

- **Hindi-first** chrome and default metadata
- English where appropriate
- Correct hreflang pairs
- No mixed-language title/description pairs on the same URL locale

---

## 10. COMPLETE checklist

A feature is **COMPLETE** only when all pass:

1. Functional tests
2. Typecheck
3. Build
4. Responsive checks
5. Accessibility checks
6. SEO audit (this document)
7. Structured data validation (when present)
8. Sitemap updated / verified for new indexable routes
9. Internal links verified
10. Metadata verified (unique title, description, canonical)

If any item fails, the feature remains **incomplete** even if UI/tests look done.
