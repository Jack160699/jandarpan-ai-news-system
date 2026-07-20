# REMAINING_MANUAL_ACTIONS

**Step:** 4 — Environment & Security Hardening

## Required for Step 4 completion

1. **Push branch** `fix/step4-environment-security-hardening` and open PR (**PR number TBD**).
2. **Merge** after CI green (cron-auth + two-factor tests).
3. **Redeploy Production** so newly configured env vars and Step 4 code become live.
   - Current pre-redeploy: `dpl_dqno1GZSPufCJJUVjCyfpuubWqiN` @ `f23df88`.
4. **Run** `.github/workflows/step4-ops-probe.yml` → authenticated GET `/api/health`.
5. **Confirm** Redis / infrastructure checks; clear Step 4–related env warnings where expected.
6. **Observe** natural Vercel Cron runs (ingest / pipeline / ops) for auth success under dual-accept.
7. **Fill TBD fields** in delivery docs (PR #, Preview URL, new deployment ID/SHA, probe results).

## Preview env parity (PARTIAL)

- Retry Preview / branch env adds after branch is pushed:
  - scoped `CRON_INGEST_SECRET`, `CRON_PIPELINE_SECRET`, `CRON_OPS_SECRET`, `CRON_ADMIN_SECRET`
  - `SECURITY_2FA_ENCRYPTION_KEY`
  - `AI_LOCAL_ENRICH_ENABLED` (explicit false)
- Prefer Vercel dashboard if non-interactive CLI still hits `git_branch_required`.

## Explicitly not required now

| Item | Reason |
|---|---|
| 2FA ciphertext migration | Case A — zero rows |
| Removing `CRON_SECRET` acceptance | Would break Vercel Cron callers |
| Google CSE configuration | Optional; warn only |
| Claiming full scoped cron isolation | Callers still send `CRON_SECRET` |

## Optional later

- Point QStash / GitHub Actions to scoped secrets per route class.
- Case C 2FA re-encrypt tooling when rows exist under legacy material.
- Add Google CSE if product requires it.
