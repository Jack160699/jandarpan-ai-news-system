# PRODUCTION_DEPLOYMENT

**Step:** 4 — Environment & Security Hardening  
**Production URL:** https://www.jandarpan.news  
**Vercel project:** newspaper-motion (jack160699s-projects)

## Pre-redeploy baseline (current Production)

| Field | Value |
|---|---|
| Deployment ID | `dpl_dqno1GZSPufCJJUVjCyfpuubWqiN` |
| SHA | `f23df88df3cd1fc323f13ebd03e9f09a0dc5e955` |
| Note | Pre–Step 4 redeploy; env changes **not live** until redeploy |

## Env changes already applied (Production)

Configured (values not recorded):

- `AI_LOCAL_ENRICH_ENABLED` (explicit false)
- `SECURITY_2FA_ENCRYPTION_KEY`
- `CRON_INGEST_SECRET`
- `CRON_PIPELINE_SECRET`
- `CRON_OPS_SECRET`
- `CRON_ADMIN_SECRET`
- `CRON_SECRET` (preserved)
- Upstash Redis URL/TOKEN (unchanged)

**Important:** Vercel does not activate new/changed env for the running deployment until redeploy.

## Redeploy plan

1. Merge PR from `fix/step4-environment-security-hardening` (**PR number TBD**).
2. Promote / redeploy Production so new code + env bind together.
3. Record new Production deployment ID and SHA in `PRODUCTION_VERIFICATION.md` / `STEP_4_FINAL_REPORT.md`.
4. Run `step4-ops-probe.yml` (authenticated GET `/api/health` only).
5. Observe natural Vercel crons (ingest/pipeline/ops) for auth success.

## Rollback

| Asset | Target |
|---|---|
| Git branch | `backup/before-step4-environment-security-hardening` @ `f23df88` |
| Deployment | `dpl_dqno1GZSPufCJJUVjCyfpuubWqiN` @ SHA `f23df88df3cd1fc323f13ebd03e9f09a0dc5e955` |

Prefer instant rollback to known-good deployment if post-redeploy health fails critically.

## Status

| Gate | Status |
|---|---|
| Production env vars set | Done |
| Production redeploy with Step 4 code | **REQUIRED / pending** |
| Post-redeploy verification | Pending (see `PRODUCTION_VERIFICATION.md`) |
