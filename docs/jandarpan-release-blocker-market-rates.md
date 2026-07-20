# Release blocker — Market / rates

**Branch:** `feat/jandarpan-reader-design-system`
**Date:** 2026-07-21
**Overall market/rates verdict:** **PARTIALLY CLOSED**

---

## What shipped

| Feed | Status |
|------|--------|
| AGMARKNET mandi (data.gov.in) | **Implemented** (live-fetch; no DB history) |
| Verified rates history platform (schema, APIs, graphs, SEO pages) | **Implemented** |
| Gold / silver live numbers | **Externally gated** (IBJA consent + token) |
| Diesel / petrol live numbers | **Externally gated** (ULIP license + adapter live wiring) |
| Sensex / Nifty / FX | Omitted |
| Weather (Open-Meteo) | Unchanged — still live |

---

## Verified rates history

- Migration: `064_verified_rates_history.sql`
- Pages: `/rates`, `/rates/chhattisgarh`, city fuel routes, state bullion routes
- API: `/api/utilities/verified-rates/history`, dataset CSV when eligible
- Sitemap: `/sitemap-rates.xml`
- Admin: `/admin/verified-rates`
- Reader DS: history links (no fake tiles)
- Docs: `docs/jandarpan-rates-history-architecture.md`, graphing, SEO checklist, operations

History accumulates only from real accepted verifications. **No fabricated backfill.**

---

## Remaining (keeps blocker PARTIAL)

1. ULIP fuel credentials + live adapter validation for Raipur/Durg/Bhilai
2. IBJA token + written display consent for gold/silver
3. Seven-run stability gate once providers are live
4. Natural accumulation of 7D/30D history after go-live

Until then public rate pages correctly show blocked/unavailable + methodology content.
