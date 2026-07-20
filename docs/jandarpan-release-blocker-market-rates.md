# Release blocker — Market / rates (mandi first)

**Branch:** `feat/jandarpan-reader-design-system`  
**Date:** 2026-07-21  
**Overall market/rates verdict:** **PARTIALLY CLOSED**

---

## What shipped

| Feed | Status |
|------|--------|
| AGMARKNET mandi (data.gov.in) | **Implemented** (honest; Preview key currently empty → unavailable) |
| Gold / silver | Omitted |
| Diesel / petrol | Omitted |
| Sensex / Nifty / FX | Omitted |
| Weather (Open-Meteo) | Unchanged — still live |

---

## Provider

| Item | Value |
|------|--------|
| Catalog | Current daily price of various commodities from various markets (Mandi) |
| Resource ID | `9ef84268-d588-465a-a308-a864a43d0070` |
| Host | `https://api.data.gov.in` |
| Auth | `DATA_GOV_IN_API_KEY` (server-only, never `NEXT_PUBLIC_`) |
| Source attribution | `AGMARKNET / data.gov.in` |

See also: `docs/jandarpan-mandi-provider-audit.md`.

---

## Schema (normalized)

`MandiRate`: commodity (localized), providerCommodity, variety, market, district, state, min/max/modal, unit, reportedAt, fetchedAt, freshness, source.

API: `GET /api/utilities/mandi?district=&commodity=&limit=` → available | unavailable JSON (no raw provider dump, no API key, no provider URL).

---

## Cache & freshness

| Policy | Value |
|--------|--------|
| Server cache | Next `revalidate` **45 min** (`MANDI_REVALIDATE_SEC = 2700`) |
| Client session cache | 45 min |
| Current | reported within 0–1 calendar day (IST) → title **आज का मंडी भाव** |
| Recent | 2–3 days → title **हालिया मंडी भाव** (date shown) |
| Stale | >3 days → omit from homepage selection |
| Errors | never invent cached prices |

---

## District & commodities

1. User home district (English AGMARKNET name)  
2. Raipur  
3. Any latest valid Chhattisgarh row  

Preferred commodities (matched on provider English strings): Paddy/Dhan, Wheat, Gram, Tomato, Onion — max 5 rows. Exact spellings remapped after live key validation.

Unit: **₹ / quintal** (क्विंटल) — wholesale AGMARKNET convention for this dataset.

---

## Security review

- Key read only from `process.env.DATA_GOV_IN_API_KEY`
- Not in source, not in `.env.example` as a value (name only)
- Not logged; `assertNoSecretLeak` on API responses
- Preview Vercel var currently **empty** — Production var also empty (must not be filled for Production ship)
- Browser never calls data.gov.in

---

## Failure behavior

Missing key / provider error / no CG rows / only stale → compact unavailable panel or empty rates; UtilTiles for gold/silver/fuel remain empty.

---

## Tests

- Unit: `src/features/reader-ds/utilities/mandi.test.ts`
- API: `src/app/api/utilities/mandi/route.test.ts`
- Playwright: `e2e/reader-ds-mandi.spec.ts` (+ existing smoke still asserts no gold/silver/fuel tiles)

---

## Remaining (keeps blocker PARTIAL)

Gold, silver, diesel, petrol, Sensex, Nifty, FX — still no honest feeds.
