# Verified rates — source matrix

**Updated:** 2026-07-21  
**Branch:** `feat/jandarpan-reader-design-system`  
**Supabase project:** `giiuqshoconjbpiueasp`

| Family | Adapter | Categories | Credentials | Display rights | Implementation | Eligibility today | Blocked reason |
|--------|---------|------------|-------------|----------------|----------------|-------------------|----------------|
| HPCL via ULIP | `fuel-ulip.ts` | petrol, diesel | `ULIP_API_KEY`, `ULIP_CLIENT_ID`, `VERIFIED_RATES_FUEL_ENABLED=1` | Requires licensed programmatic access | Ready (host allowlist, timeout, retries) | **blocked** | Credentials absent in Preview/local |
| IOCL licensed | `fuel-iocl-licensed.ts` | petrol, diesel | `IOCL_RATES_API_KEY`, `VERIFIED_RATES_FUEL_IOCL_ENABLED=1` | Requires commercial licensed feed | Gated stub (no scrape) | **blocked** | No licensed endpoint/creds |
| IBJA Rates API | `bullion-ibja.ts` | gold 24K/22K, silver 999 | `IBJA_ACCESS_TOKEN`, `VERIFIED_RATES_BULLION_ENABLED=1` | **`IBJA_DISPLAY_CONSENT=1` only after written consent** | Ready (allowlist, timeout, retries) | **blocked** | Token + written consent absent |
| Bullion licensed B | `bullion-licensed-secondary.ts` | gold/silver | `BULLION_SECONDARY_API_KEY` | Required | Gated stub | **blocked** | No provider contract |
| Bullion licensed C | `bullion-licensed-tertiary.ts` | gold/silver | `BULLION_TERTIARY_API_KEY` | Required | Gated stub | **blocked** | No provider contract |
| OMC HTML / SMS scrape | — | fuel | — | — | **rejected** | rejected | ToS / unstable |
| Jeweller / Goodreturns scrape | — | bullion | — | — | **rejected** | rejected | Not licensed |
| Fabricated / seeded history | — | any | — | — | **rejected** | rejected | Policy |

## Consensus thresholds (enforced)

| Group | Min independent families | Spread | Notes |
|-------|--------------------------|--------|-------|
| Fuel | **2** | ≤ ₹0.20 / litre | Same city, date, unit; derived never counts |
| Gold | **3** | ≤ 0.75% | Same purity, unit, tax basis |
| Silver | **3** | ≤ 1.0% | Same purity, unit, tax basis |

Single-source observations may be stored when a provider returns `ok`, but **never** published as verified consensus / snapshot.

## Geography

- Fuel: Raipur, Durg, Bhilai (city-level; do not conflate Durg/Bhilai).
- Bullion: India / Chhattisgarh indicative — **not** city jewellery MRP.
