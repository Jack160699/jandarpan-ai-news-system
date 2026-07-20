# OPTIONAL_INTEGRATIONS

**Step:** 4 — Environment & Security Hardening  
**Rule:** Missing optional integrations are warnings, not Critical blockers.

## Inventory

| Integration | Variable / signal | Status | Severity if missing |
|---|---|---|---|
| Google Custom Search (CSE) | CSE-related config | **Missing** | Optional warn — **not Critical** |
| SerpAPI | `SERPAPI_KEY` | Configured | N/A |
| Google Search Console | `GSC_SITE_URL` | Configured | N/A |
| Sentry | Sentry DSN / project config | Configured | N/A |

## Google CSE

- Absent in current Production posture.
- Expected behavior: optional enrichment / search assist paths may warn or skip.
- **Do not** fail Step 4 or Production go/no-go solely because CSE is missing.

## Configured optionals

- `SERPAPI_KEY` — present (value not recorded)
- `GSC_SITE_URL` — present (value not recorded)
- Sentry — configured (identifiers/secrets not recorded)

## Guidance

| Finding | Treat as |
|---|---|
| CSE missing | Warning / backlog |
| SERPAPI / GSC / Sentry missing | Would be higher priority if observed; currently configured |
| Scoped cron / 2FA / Redis issues | In-scope Step 4 security items (see other audits) |

## Follow-up (optional, not blocking)

1. Decide whether CSE is required for product features.
2. If yes, add CSE credentials via Vercel dashboard and redeploy.
3. If no, keep as documented optional warn in ops runbooks.
