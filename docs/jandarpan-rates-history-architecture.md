# Jan Darpan — Verified rates history architecture

**Branch:** `feat/jandarpan-reader-design-system`  
**Date:** 2026-07-21  
**Status:** Schema + pipeline ready; live feeds **CREDENTIALS_REQUIRED** / **DISPLAY_PERMISSION_REQUIRED**

## Reality check

Mandi (AGMARKNET) remains a separate live utility. This module owns durable verified daily snapshots for petrol, diesel, gold 24K/22K, and silver 999.

## Migration repair (2026-07-21)

**Root cause:** Local numbered migrations `045`–`064` vs remote timestamped versions (`20260707…` etc.). Schema for SEO/founding/etc. already existed under timestamps; `064` had never been applied (`verified_rate_*` missing).

**Repair (non-destructive):**

1. Documented recovery counts (founding_offer_claims / seo_actions / news_articles)  
2. History-sync stub files for remote-only timestamps (`select 1;`)  
3. `supabase migration repair --linked --status applied` for `045`–`063` after schema presence verified  
4. Applied `064_verified_rates_history.sql` forward-only  
5. Applied `20260720214804_verified_rates_hardening.sql` (revoke anon grants, provider health, immutability trigger, extra source registry rows)

**Remote now aligned** through `20260720214804`. No Production reset. No table drops for metadata.

## Tables

| Table | Role |
|-------|------|
| `verified_rate_sources` | Source registry / eligibility |
| `verified_rate_verification_runs` | Every verification attempt (evidence) |
| `verified_rate_observations` | Per-source observations for a run |
| `verified_rate_daily_snapshots` | Immutable accepted daily graph points |
| `verified_rate_provider_health` | Kill switch / circuit / attempt stats |

RLS: service_role only. Anon/authenticated revoked. No manual price override UI. Accepted snapshots: economic fields immutable; supersede via status only.

## Consensus engine

`src/lib/verified-rates/consensus.ts`

- Fuel: ≥2 independent families, spread ≤ ₹0.20/L  
- Bullion: ≥3 independent families, gold ≤0.75%, silver ≤1.0%  
- Derived values never count as independent families  
- Snapshot only if consensus `accepted`

## Providers

See `docs/jandarpan-autonomous-rates-source-matrix.md`.

## Services

- History / movement / ranges — `src/lib/verified-rates/`  
- Cron — `/api/cron/verified-rates`  
- History API — `/api/utilities/verified-rates/history`  
- CSV (≥7 points) — `/api/utilities/verified-rates/dataset`

## Geography honesty

- Fuel cities: Raipur, Durg, Bhilai only  
- Bullion: state/India indicative — **no** fake city jewellery MRP  

## Current data state

- Real accepted observations / snapshots: **0** (providers blocked)  
- Fabricated history: **none**  
