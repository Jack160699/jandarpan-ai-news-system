# Release blocker — Desktop / tablet Reader DS fidelity

**Date:** 2026-07-21  
**Branch:** `feat/jandarpan-reader-design-system`  
**Implementation commit (verified):** `02c69d81a66b7c7896c3c8797a5de1edcda3a71c` (`02c69d8`)  
**Source of truth:** `docs/jandarpan-reader-redesign/source-designs/desktop-tablet/jandarpan-desktop-tablet-design-brief.html`  
**Formal review:** `docs/jandarpan-reader-redesign/desktop-tablet-formal-visual-review.md`

---

## Blocker status

| Item | Status |
|------|--------|
| Desktop/tablet SoT chrome (Util → Brand → CatNav) | **Implemented** |
| Breakpoints 768 / 1024 / 1280 / 1440 + containers 1160/1240 | **Implemented** |
| Homepage desk composition | **Implemented** |
| Article share rail + reading ≤680 + opinion layout | **Implemented** |
| 1. Search filter rail | **Closed** |
| 2. Category skyscraper / side rail | **Closed** |
| 3. Photo-story thumbnail rail | **Closed** |
| 4. Login two-panel layout | **Closed** |
| 5. Account dual-rail layout | **Closed** |
| 6. Source-backed ad inventory (reserved) | **Closed** |
| Formal visual rubric (≥85 desk/tablet, no major &lt;80) | **Passed** |
| **Overall desktop/tablet blocker** | **CLOSED** |

**Unchanged / deferred (by mandate):**
- Razorpay / checkout — deferred and open  
- Market tiles — omitted (no honest feed)  
- Offline downloads — open  
- Production `NEXT_PUBLIC_READER_DS` — remains disabled  

---

## Exact Ready Preview (commit 02c69d8)

| Field | Value |
|-------|--------|
| Project | `jack160699s-projects/newspaper-motion` |
| Branch | `feat/jandarpan-reader-design-system` |
| Git SHA | `02c69d81a66b7c7896c3c8797a5de1edcda3a71c` |
| Deployment ID | `dpl_9YxAvDBHi6MFLUDjkh9VXZinXtef` |
| Deployment URL | https://newspaper-motion-4jcmyqw76-jack160699s-projects.vercel.app |
| Alias URL | https://newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app |
| State | **Ready** |

Verified via `vercel api /v13/deployments/dpl_9YxAvDBHi6MFLUDjkh9VXZinXtef` (`gitSource.sha` matches).

---

## Verification matrix (do not misread infrastructure failures as UI bugs)

| Check | Result | Classification |
|-------|--------|----------------|
| Local Playwright smoke (`e2e/reader-ds-smoke.spec.ts`) | **14/14 passed** | Functional UI |
| Formal visual rubric | Desktop **88.7** · Tablet **85.9** · lowest **82** · phone **90** | Visual fidelity |
| Deployment readiness poll (earlier run) | **Timed out before Ready** | **Infrastructure only** — `deployment_readiness_polling_timeout`. Does **not** prove missing Reader DS markup. |
| Hardened poll (`poll-vercel-preview-by-sha.cjs --sha 02c69d8`) | **Ready** matched `dpl_9YxAvDBHi6MFLUDjkh9VXZinXtef` | Deployment readiness |
| Unauthenticated Preview Playwright / plain HTTP | **Blocked by Vercel SSO** | **Infrastructure only** — `preview_authentication_sso_limitation`. SSO HTML without `.jd-ds` must **not** be reported as a product failure. |
| Protected Preview Playwright suite | **3 skipped** with `BLOCKED_BY_VERCEL_SSO` (not failed as UI) | Infrastructure gate |
| Authenticated Preview markup (`vercel curl`) | **Confirmed** on Ready `dpl_9YxAvDBHi6MFLUDjkh9VXZinXtef` | Deployed markup |

### Six SoT gaps on authenticated Preview (class/marker presence)

| Gap | Preview marker result |
|-----|------------------------|
| Search filter rail | Present (`jd-search-filter-rail` / results column) |
| Category skyscraper / side rail | Present (`jd-category-rail` + `category.skyscraper`) |
| Photo thumbnail rail | Present (`jd-photo-story__thumbs` via QA preview) |
| Login two-panel | Present (`jd-signin-card` + brand + form panels) |
| Account nav rail | Present (`jd-account-nav`) |
| Reserved ad slots | Present (`data-jd-ad-placement` / reserved ad) |

Independent formal screenshot rubric was run locally against DS-enabled builds (see formal review doc). Authenticated Preview browser screenshots were not required for closure once markup + local rubric + local smoke passed.

---

## Hardened Preview workflow (tools)

| Script / suite | Purpose |
|----------------|---------|
| `scripts/poll-vercel-preview-by-sha.cjs` | Poll exact SHA; exit 0 Ready, 2 Error/Canceled, 3 TIMEOUT (infra), never product-fail on timeout |
| `scripts/verify-preview-markup-vercel-curl.cjs` | Authenticated `vercel curl` marker checks; SSO → exit 3 `BLOCKED_BY_VERCEL_SSO` |
| `e2e/reader-ds-smoke.spec.ts` | **A. Local functional smoke** (main UI verification) |
| `e2e/reader-ds-preview-protected.spec.ts` | **B. Protected Preview smoke** — skips with `BLOCKED_BY_VERCEL_SSO` if SSO HTML detected |

npm helpers: `verify:preview-poll`, `verify:preview-markup`, `test:reader-ds:preview`.

Stable `data-testid` attributes added for markup checks (non-visual):  
`jd-reader-ds`, `jd-search-filter-rail`, `jd-search-results-column`, `jd-search-filter-trigger`, `jd-login-two-panel`, `jd-login-brand-panel`, `jd-login-auth-panel`, `jd-category-side-rail`, `jd-photo-thumbnail-rail`, `jd-account-nav-rail`, `jd-reserved-ad`.

---

## Source-frame mapping

| Frame | Implementation |
|-------|----------------|
| H01–H04 | `DeskChrome` |
| D01 / T01 / TP01 | `ReaderHomepage` |
| D02 / T03 | `CategoryPage` + `.jd-category-rail` skyscraper |
| D03 / T02 | `ReaderArticlePage` + share/sidebar rails |
| D06 | `PhotoGallery` thumb rail |
| D08 | `SearchResultsPage` filter rail / drawer |
| D13 | `SignInPage` two-panel |
| D15 | `AccountShell` + profile/saved |
| Ad inventory | `ReservedAd` placement IDs |

---

## Formal score summary

| Metric | Value |
|--------|------:|
| Desktop average (@1440 major screens) | **88.7** |
| Tablet average (1024+768 majors) | **85.9** |
| Lowest major screen | **82** (category @768) |
| Phone regression (home @390) | **90** |

Full table + mismatches: `desktop-tablet-formal-visual-review.md`.

---

## Remaining low/medium mismatches

1. Medium — phone sticky dismissible ad still present on desktop homepage  
2. Medium — homepage section density lighter than full SoT band set  
3. Low — sparse local empty states (honest)  
4. Low — account hub list vs decorative SoT saved grid  

No HIGH source-backed gap remains for this blocker.

---

## Final verdict rule applied

Closure is based on: implementation completeness · local functional tests · authenticated deployed-markup verification · formal visual rubric.  

It is **not** downgraded solely because protected Preview cannot be fetched anonymously.
