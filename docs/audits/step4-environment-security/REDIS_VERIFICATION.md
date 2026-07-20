# REDIS_VERIFICATION

**Step:** 4 — Environment & Security Hardening  
**Canonical variables:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Environment status

| Scope | URL | TOKEN | Notes |
|---|---|---|---|
| Production | configured | configured | Unchanged this step; Encrypted ~17d |
| Preview | configured | configured | Encrypted ~17d |

Values are never recorded here.

## Local / CLI limitation

- `vercel env pull` / `env run` **redacts Sensitive values to empty**.
- Local Redis R/W verification without dashboard/API decrypt is **not feasible** via CLI pull alone.
- Do not treat empty pulled values as “missing Redis config.”

## Intended verification path

1. Production redeploy (env already present; redeploy required for Step 4 code + any related env freshness).
2. Run GitHub Actions workflow `.github/workflows/step4-ops-probe.yml`.
3. Workflow performs authenticated **GET `/api/health` only** (no `fetch-news`).
4. Inspect response fields: `infrastructure.redis` and related health `checks`.

## R/W test status

| Check | Status |
|---|---|
| Vars present Encrypted (Prod + Preview) | Yes (~17d) |
| Local R/W via pulled env | Blocked by CLI redaction |
| Post-redeploy ops probe Redis check | **PENDING_UNTIL_REDEPLOY_PROBE** |

## Pass criteria (post probe)

- `/api/health` reports Redis infrastructure healthy / no Redis critical failure.
- No new Redis-related env warnings attributable to missing URL/token.
- Probe does **not** invoke ingest or mutation crons.
