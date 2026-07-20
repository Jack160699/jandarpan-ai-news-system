# CODE_CHANGES

**Step:** 4 — Environment & Security Hardening  
**Working branch:** `fix/step4-environment-security-hardening`  
**Rollback branch:** `backup/before-step4-environment-security-hardening` @ `f23df88`

## Summary

Hardening-focused code: timing-safe cron auth, dual-key 2FA crypto path, expanded tests, and a narrow ops probe workflow. No secret values in repo.

## Files

### `src/lib/infrastructure/auth/cron-auth.ts`

- Secret comparison uses `timingSafeEqual` (constant-time).
- Accepts **scoped** secrets (`CRON_INGEST_SECRET`, `CRON_PIPELINE_SECRET`, `CRON_OPS_SECRET`, `CRON_ADMIN_SECRET`) **or** legacy `CRON_SECRET`.
- Preserves compatibility with Vercel Cron / QStash / Actions callers that still send `CRON_SECRET`.

### `src/lib/security/two-factor.ts`

- Decrypt: dual-key path — dedicated `SECURITY_2FA_ENCRYPTION_KEY` first, then service-role legacy.
- Encrypt: prefers dedicated key when configured.
- Helpers exported for tests / future Case C migration tooling.
- No immediate record migration (Case A: zero rows).

### Tests

- `cron-auth.phase8.test.ts` — expanded coverage for timing-safe / scoped+legacy accept paths.
- `two-factor.step4.test.ts` — added for dedicated/legacy decrypt and encrypt preference behavior.

### `.github/workflows/step4-ops-probe.yml`

- Authenticated **GET `/api/health` only**.
- Does **not** call `fetch-news` or other mutating crons.
- Intended to validate Redis/infrastructure checks post-redeploy.

## Out of scope in code

- Removing `CRON_SECRET` acceptance (would break Vercel Cron).
- Automatic ciphertext re-encrypt for 2FA (unnecessary under Case A).
- Preview env provisioning (platform/CLI limitation; documented separately).

## Delivery placeholders

| Item | Status |
|---|---|
| PR number | **TBD** (fill after merge) |
| Preview URL | **TBD** |
| Production redeploy | **REQUIRED** after env changes |
