# Autonomous / verified rates — operations

## Cron

`GET /api/cron/verified-rates` (Vercel schedule `20 1,7,13,19 * * *`)
Auth: `Authorization: Bearer $CRON_SECRET` or `?secret=`

Runs petrol/diesel for Raipur, Durg, Bhilai and bullion categories. Persists only accepted provider results.

## Admin

`/admin/verified-rates` — diagnostics only:

- provider gates
- snapshot counts / date span
- graph eligibility / ranges
- dataset eligibility
- sitemap route count

**No** manual price entry.

## Safe actions

- Rerun cron
- Inspect `/api/utilities/verified-rates/history`
- Clear CDN/page cache via normal revalidation (no price override)

## Env (server-only)

See `docs/ENVIRONMENT.md`:

- `VERIFIED_RATES_FUEL_ENABLED`
- `ULIP_API_KEY` / `ULIP_CLIENT_ID`
- `VERIFIED_RATES_BULLION_ENABLED`
- `IBJA_ACCESS_TOKEN`
- `IBJA_DISPLAY_CONSENT`
- optional `IBJA_RATES_URL`
