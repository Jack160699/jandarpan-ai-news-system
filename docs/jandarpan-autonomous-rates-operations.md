# Autonomous / verified rates — operations

**Updated:** 2026-07-21  
**Branch:** `feat/jandarpan-reader-design-system`  
**Supabase:** `giiuqshoconjbpiueasp`  
**Migration state:** `064_verified_rates_history` + `20260720214804_verified_rates_hardening` applied remotely

## Cron (Preview / Vercel)

Path: `/api/cron/verified-rates`  
Schedule (`vercel.json`, **UTC** — map to Asia/Kolkata for ops):

| UTC | IST (approx) | Intent |
|-----|--------------|--------|
| `30 0 * * *` | 06:00 | Fuel primary |
| `30 1 * * *` | 07:00 | Fuel retry (+30m window) |
| `30 3 * * *` | 09:00 | Fuel retry / mid-morning |
| `30 7 * * *` | 13:00 | Midday health |
| `30 13 * * *` | 19:00 | Bullion evening |

Auth (required — endpoint not public):

- `verifyCronRequest` with capability `ops`
- `Authorization: Bearer $CRON_SECRET` and/or QStash signature where configured

Behavior:

- Runs petrol/diesel for Raipur, Durg, Bhilai and bullion categories
- Persists provider observations when `ok`
- Publishes daily snapshot **only** on accepted multi-family consensus
- Records blocked/unavailable runs without inventing prices
- Provider health: consecutive failures → circuit open; kill switch supported

## Seven-run stability gate

Status: **PENDING_STABILITY_GATE**

Evaluate only genuine scheduled runs (no artificial timestamps). For each run record: time, provider counts, rejections, consensus, spread, latency, snapshot result, errors. Production remains disabled until seven clean scheduled runs.

## Admin

`/admin/verified-rates` — diagnostics only (gates, counts, eligibility). **No** manual price entry.

## Env (server-only — never commit values)

| Variable | Purpose |
|----------|---------|
| `VERIFIED_RATES_FUEL_ENABLED` | `1` to attempt ULIP |
| `ULIP_API_KEY` / `ULIP_CLIENT_ID` | ULIP credentials |
| `ULIP_FUEL_RATES_URL` | Optional allowlisted override |
| `VERIFIED_RATES_FUEL_IOCL_ENABLED` | `1` to attempt IOCL licensed |
| `IOCL_RATES_API_KEY` | Second fuel family |
| `VERIFIED_RATES_BULLION_ENABLED` | `1` to attempt IBJA |
| `IBJA_ACCESS_TOKEN` | IBJA token |
| `IBJA_DISPLAY_CONSENT` | `1` only after **written** republication consent |
| `IBJA_RATES_URL` | Optional allowlisted override |
| `VERIFIED_RATES_BULLION_SECONDARY_ENABLED` / `BULLION_SECONDARY_API_KEY` | Family B |
| `VERIFIED_RATES_BULLION_TERTIARY_ENABLED` / `BULLION_TERTIARY_API_KEY` | Family C |
| `CRON_SECRET` | Cron auth |

## External checklist (current blockers)

1. Obtain ULIP programmatic credentials + display rights; set Preview env; enable fuel flag  
2. Obtain second independent licensed fuel family (IOCL or equivalent)  
3. Obtain IBJA token + **written** display/redistribution consent; set `IBJA_DISPLAY_CONSENT=1` only then  
4. Contract two additional independent bullion families (or keep bullion non-publishing)  
5. Keep Production flags off until seven-run gate passes  

## Safe actions

- Rerun authenticated cron on Preview  
- Inspect history API / admin diagnostics  
- Do **not** seed prices or lower consensus thresholds to force display  
