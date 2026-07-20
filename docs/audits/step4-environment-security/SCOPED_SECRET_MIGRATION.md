# SCOPED_SECRET_MIGRATION

**Step:** 4 — Environment & Security Hardening  
**Goal:** Introduce route-class scoped cron secrets without breaking existing callers.

## What was done (Production)

| Secret | Action |
|---|---|
| `CRON_INGEST_SECRET` | Added (was missing) |
| `CRON_PIPELINE_SECRET` | Added (was missing) |
| `CRON_OPS_SECRET` | Added (was missing) |
| `CRON_ADMIN_SECRET` | Added (was missing) |
| `CRON_SECRET` | Preserved; not overwritten |

Preview parity for these variables: **not completed** (CLI `git_branch_required` / branch not pushed). See `REMAINING_MANUAL_ACTIONS.md`.

## Compatibility model

```
Request secret
  └─ match scoped secret for route class? → accept
  └─ else match CRON_SECRET? → accept (legacy)
  └─ else → reject
```

- Code path: `src/lib/infrastructure/auth/cron-auth.ts`
- Compare: timing-safe (`timingSafeEqual`)
- Legacy path retained intentionally

## Why migration is incomplete

| Caller | Can send scoped secret? | Current behavior |
|---|---|---|
| Vercel Cron (`vercel.json`) | No — Authorization Bearer is `CRON_SECRET` only | Continues on legacy |
| QStash | Possible with config change | Still on `CRON_SECRET` |
| GitHub Actions (Enterprise Workers / probes) | Possible with config change | Still on `CRON_SECRET` |

**Do not claim complete scoped isolation** while callers still send `CRON_SECRET`.

## Safe next steps (post–Step 4)

1. Redeploy Production so new env vars are live.
2. Confirm dual-accept via authenticated `/api/health` ops probe.
3. Optionally point Actions/QStash to scoped secrets for their route class.
4. Leave Vercel Cron on `CRON_SECRET` until platform supports per-route headers.
5. Only after all callers migrate: consider tightening acceptance (out of scope for this step).

## Rollback

- Branch: `backup/before-step4-environment-security-hardening` @ `f23df88`
- Deployment target: `dpl_dqno1GZSPufCJJUVjCyfpuubWqiN` @ SHA `f23df88df3cd1fc323f13ebd03e9f09a0dc5e955`
- Env rollback: remove newly added scoped secrets only if needed; do not wipe `CRON_SECRET`.
