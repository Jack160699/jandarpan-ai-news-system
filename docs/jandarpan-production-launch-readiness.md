# Jan Darpan — Production Launch Readiness

**Date:** 2026-07-21  
**Feature branch:** `feat/jandarpan-reader-design-system`  
**Pre-completion SHA:** `405798a66e472c9782f39037b8552c5cf9233ca0`  
**Rollback branch:** `rollback/pre-reader-ds-production-20260721-1121` → `0dc5670b5d99e83c3715f29785615747d6b319be`  
**Original main SHA:** `0dc5670b5d99e83c3715f29785615747d6b319be`

## Verdict (pre-merge)

**READY_WITH_NON_BLOCKING_LIMITATIONS** — only if Production ships with:

1. `NEXT_PUBLIC_READER_DS` **unset / `0`** until staged enablement smoke passes  
2. Verified rates remain data-gated (noindex empty detail pages; nav hidden; cron no-ops without credentials)  
3. Paid checkout remains fail-closed and non-theatrical  
4. No fabricated fuel/bullion prices  

## Rates Production policy (Option C)

| Surface | Policy |
|---------|--------|
| `/rates`, `/rates/chhattisgarh`, `/rates/methodology` | Indexable hubs (methodology + honest explanation) |
| Fuel/bullion detail + dataset | `noindex` until ≥1 accepted snapshot (dataset until export-eligible) |
| `sitemap-rates.xml` | Hubs only until accepted snapshots exist |
| Homepage `VerifiedRatesLinks` | Hidden until any accepted snapshot |
| Cron `/api/cron/verified-rates` | Auth required; skips when providers not configured |
| `/api/cg-rates` | **503 retired** — no invented jitter |
| Admin `/admin/verified-rates` | Private diagnostics |

**Later activation:** licensed ULIP + 2nd fuel family; IBJA token + written display consent + 2 more bullion families; seven-run stability gate; then set Preview provider flags, flip public nav after snapshots, then Production.

## P0 fixes in this completion pass

- Empty rate detail SEO de-indexed + sitemap exclusion  
- Homepage rates nav gated  
- Inventing `cg-rates` disabled  
- Checkout CTA honesty (no “Pay ₹…” / secure-lock theater)  
- Verified-rates cron skip without credentials  

## Non-blocking limitations

- Live Razorpay checkout not enabled  
- Verified petrol/diesel/gold/silver feeds not operational  
- Offline “downloads” are limited (local preferences / offline SW scope)  
- Play Store packaging not in this phase  
- Reader DS Production enablement is a **separate staged flag flip** after merge smoke  

## Migration plan

Additive only vs main:

- `064_verified_rates_history.sql`  
- `20260720214804_verified_rates_hardening.sql`  
- History-sync stubs (`select 1`) for remote timestamp alignment  

No Production reset. No destructive table drops.

## Rollback

1. Vercel: promote previous Production deployment, or redeploy `rollback/pre-reader-ds-production-20260721-1121`  
2. Git: `git checkout main && git reset --hard 0dc5670` only with explicit ops approval (prefer Vercel rollback)  
3. Flag: unset `NEXT_PUBLIC_READER_DS` for instant legacy UI  

## Mandatory gates checklist

| Gate | Status |
|------|--------|
| Rollback remote branch | Done |
| Rates empty-page SEO | Fixed |
| Fake prices API | Retired |
| Checkout honesty | Fixed |
| Typecheck | Pass (local) |
| Rates unit tests | Pass |
| Production Reader DS flag | Must remain off at deploy |
| Fake rates in UI | None |

Update this file with final Preview SHA, merge SHA, and Production deployment IDs after release steps.
