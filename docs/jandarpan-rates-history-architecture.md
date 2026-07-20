# Jan Darpan — Verified rates history architecture

**Branch:** `feat/jandarpan-reader-design-system`
**Date:** 2026-07-21
**Status:** Platform shipped; live fuel/bullion feeds externally gated

## Reality check

Prior “verified-rates” product code did **not** exist. Mandi (AGMARKNET) is a separate live utility without DB history. This module adds durable verified daily snapshots for petrol, diesel, gold 24K/22K, and silver 999.

## Tables (`064_verified_rates_history.sql`)

| Table | Role |
|-------|------|
| `verified_rate_sources` | Source registry / eligibility |
| `verified_rate_verification_runs` | Every verification attempt (evidence) |
| `verified_rate_observations` | Per-source observations for a run |
| `verified_rate_daily_snapshots` | Immutable accepted daily graph points (`record_key` unique) |

RLS: service_role only. No anon writes. No manual price override UI.

## Snapshot policy

See `src/lib/verified-rates/snapshot-policy.ts` and `/rates/methodology`.

- Fuel: one accepted point per city × category × IST effective date.
- Bullion: prefer closing/evening session; else latest verified day point.
- Never copy yesterday into today.
- Gaps remain gaps.

## Providers

| Category | Adapter | Gate |
|----------|---------|------|
| petrol/diesel | `fuel-ulip.ts` | `VERIFIED_RATES_FUEL_ENABLED=1` + ULIP creds — live call still pending licensed wiring |
| gold/silver | `bullion-ibja.ts` | `VERIFIED_RATES_BULLION_ENABLED=1` + `IBJA_ACCESS_TOKEN` + `IBJA_DISPLAY_CONSENT=1` |

Without gates → `blocked` / unavailable. No fabrication.

## Services

- `getRateHistory` / movement / ranges — `src/lib/verified-rates/`
- Cron: `/api/cron/verified-rates`
- Public history API: `/api/utilities/verified-rates/history`
- CSV (when ≥7 points): `/api/utilities/verified-rates/dataset`

## Geography honesty

- Fuel cities: Raipur, Durg, Bhilai only.
- Bullion: state/India indicative — **no** fake city jewellery MRP pages.
