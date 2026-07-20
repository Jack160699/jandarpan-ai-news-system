# TEST_RESULTS

**Step:** 4 — Environment & Security Hardening  
**Local vitest:** **Not run** (no `node_modules` / disk constraint). Rely on CI / Preview.

## Expected unit coverage

### Cron auth (`cron-auth.phase8.test.ts` — expanded)

- Timing-safe compare path exercised (accept / reject).
- Scoped secret accepted for matching route class.
- Legacy `CRON_SECRET` still accepted when scoped secret absent or as fallback.
- Reject path when neither scoped nor legacy matches.
- No plaintext secrets asserted in fixtures beyond test doubles.

### Two-factor (`two-factor.step4.test.ts` — added)

- Encrypt prefers dedicated key when configured.
- Decrypt succeeds with dedicated key.
- Decrypt falls back to legacy service-role material when dedicated fails / absent (dual-key).
- Helpers exported and callable.
- Case A posture: no dependency on live DB rows.

## CI / Preview

| Layer | Status |
|---|---|
| Local vitest | Skipped (environment constraint) |
| CI on PR | **TBD** after PR opened |
| Preview deploy checks | **TBD** |
| `step4-ops-probe.yml` Redis/health | **PENDING_UNTIL_REDEPLOY_PROBE** |

## Pass criteria for this doc after CI

1. Cron auth expanded tests green.
2. Two-factor Step 4 tests green.
3. Ops probe (post-redeploy) shows healthy Redis / no critical env warnings for Step 4 vars.

Until CI runs, treat unit results as **expected coverage listed, execution deferred to CI**.
