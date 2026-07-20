# Release blocker — A1 weather + market tiles

**Date:** 2026-07-20  
**Branch:** `feat/jandarpan-reader-design-system`  
**Scope:** Honest A1 utility weather + market/rates for Reader Design System  
**Explicitly out of scope:** Razorpay, checkout, payments scaffolding, Production deploy, merge to `main`

---

## Blocker status

| Area | Status |
|------|--------|
| **Weather (Open-Meteo)** | **Closed** — live district weather in A1 `UtilityRow` |
| **Market / rates tiles** | **Still open** — no honest live feed; tiles omitted |
| **Overall A1 utilities blocker** | **Partially closed** |

Payment / Razorpay checkout blocker **#2 remains deferred and open**. Production `NEXT_PUBLIC_READER_DS` remains **disabled**. No payment implementation was performed in this work.

---

## Phase 1 audit findings

### Weather provider

| Item | Finding |
|------|---------|
| Integrated? | **Yes** — Open-Meteo via `GET /api/weather?district=` |
| Credentials | **None required** (public forecast API) |
| Districts | Lat/lng on `src/lib/regional/districts.ts`; default **Raipur** |
| Legacy chrome | `TopBarDateline` already consumed `/api/weather` |
| Reader DS before this work | `UtilityRow` accepted optional `temp` but homepage never passed it |

### Market / rates providers

| Item | Finding |
|------|---------|
| Honest live feed? | **No** |
| `cg-rates` / `market-data` | **Fabricated jittered prices** — not safe for A1 |
| Env vars (weather / fuel / gold / silver / mandi / indices / FX) | **None** on `newspaper-motion` |
| Cron / DB tables for rates | **None** suitable for production A1 |
| Plot A1 expectation | Weather temp **plus** सोना / चांदी / डीज़ल tiles |

### What can be sourced reliably today

- District weather: temperature, condition, location, freshness (Open-Meteo)

### What cannot without new credentials / contracts

- Gold, silver, petrol, diesel, Sensex, Nifty, INR FX, local mandi rates (no licensed/honest feed wired)

### Fallback before this work

- Gatekeeper removed placeholder `32°` and fake UtilTiles defaults
- `UtilTiles` returned `null` without props
- Weather slot empty (spacer only)

---

## Providers used

| Surface | Provider | Auth |
|---------|----------|------|
| Weather | [Open-Meteo](https://open-meteo.com/) `api.open-meteo.com` | None |
| Market tiles | *(none)* | — |

Server cache: Next fetch `revalidate` **1800s** (30 min). Client sessionStorage TTL **30 min** (`WEATHER_MAX_AGE_MS`). Beyond max age → treat as unavailable (do not show stale numbers).

---

## Data shown vs omitted

### Shown (when fetch succeeds)

- Selected district (or Raipur default)
- Temperature (°C)
- Weather icon (sun / rain from WMO code)
- Source attribution in `title` tooltip (`Open-Meteo` + `fetchedAt`)

### Intentionally omitted

- Gold / silver / diesel (and all other market tiles) until a real feed exists
- Fabricated % changes
- Any use of `/api/cg-rates` or jitter helpers for Reader DS A1
- Placeholder numeric weather

### Unavailable weather

- Reserved min-width slot
- Em dash / `util.weatherUnavailable` — **no invented temp**
- Page continues to render

---

## Data contract

| Module | Role |
|--------|------|
| `src/lib/weather/types.ts` | `DistrictWeatherSnapshot` (value, location, source, fetched_at, status, stale, error-safe) |
| `src/lib/weather/open-meteo.ts` | Fetch / parse / stale / API JSON |
| `src/features/reader-ds/data/a1-utilities.ts` | A1 rates tile contract + honest filter |
| UI | Consumes snapshot/view only — no provider URLs in components |

---

## UI fidelity

- Placement: A1 masthead → `UtilityRow` (navyDeep) → content; `UtilTiles` remains below hero but renders **null** without honest rates
- Hindi-first labels + English via `useJdDsT`
- Loading skeleton reserves weather width (no layout jump)
- Responsive: phone / tablet / desktop (same compact row; no unrelated redesign)

---

## Failure behavior

| Case | Behavior |
|------|----------|
| Provider timeout (8s) | `status: timeout` → unavailable UI |
| Invalid JSON / missing temp | `status: invalid` → unavailable |
| Missing API key | N/A for Open-Meteo; no fake data path |
| Stale > 30 min | Cleared; not displayed as live |
| Unknown district | Falls back to Raipur coordinates |
| Reader DS flag off | Legacy chrome unchanged (separate TopBar weather) |

---

## Tests

| Suite | Coverage |
|-------|----------|
| `src/lib/weather/open-meteo.test.ts` | Valid / malformed / timeout / HTTP fail / no secrets in URL / stale / district fallback / rates omit / i18n keys |
| `e2e/reader-ds-smoke.spec.ts` | Mocked weather shows `29°`; unavailable invents no `\d+°`; util-tiles absent |

---

## Known limitations

1. Market tiles still missing vs Plot A1 completeness.
2. Open-Meteo is a forecast model, not an official IMD station reading — attributed as Open-Meteo.
3. Condition text is compact WMO mapping, not a full forecast UI.
4. `cg-rates` API remains in repo for legacy/super-menu — must not be reconnected to A1 without a real source.

---

## Remaining owner actions

1. **Acquire / wire** licensed or official feeds for gold/silver/fuel (and optional mandi/indices) → then populate `A1RateTile[]`.
2. Keep **checkout / Razorpay** deferred until credentials + product decision (blocker #2 open).
3. Keep **Production** `NEXT_PUBLIC_READER_DS` unset until HIGH blockers closed.
4. Do **not** merge to `main` solely for this partial A1 close.
5. Continue tablet/desktop Plot parity as a separate blocker (this change only validates A1 utilities responsively).

---

## Files touched (this blocker)

- `src/lib/weather/*` (types, codes, open-meteo, index, tests)
- `src/app/api/weather/route.ts`
- `src/features/reader-ds/data/a1-utilities.ts`
- `src/features/reader-ds/hooks/useDistrictWeather.ts`
- `src/features/reader-ds/components/UtilityRow.tsx`
- `src/features/reader-ds/components/UtilTiles.tsx`
- `src/features/reader-ds/i18n/strings.ts`
- `src/features/reader-ds/homepage/ReaderHomepage.tsx`
- `src/features/reader-ds/system/LoadingSkeleton.tsx`
- `e2e/reader-ds-smoke.spec.ts`
- `docs/jandarpan-release-blocker-a1-weather-market.md` (this file)
- Release certification / production-release notes (status updates)
