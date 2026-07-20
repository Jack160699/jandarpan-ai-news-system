# PRODUCTION_VERIFICATION

**Step:** 4 — Environment & Security Hardening  
**Site:** https://www.jandarpan.news

## Current Production (before Step 4 redeploy)

| Field | Value |
|---|---|
| Deployment | `dpl_dqno1GZSPufCJJUVjCyfpuubWqiN` |
| SHA | `f23df88df3cd1fc323f13ebd03e9f09a0dc5e955` |
| Step 4 env live? | **No** — redeploy required |
| Step 4 code live? | **No** — pending merge/redeploy |

## Post-redeploy checklist (fill after deploy)

| Check | Expected | Result |
|---|---|---|
| New deployment ID | Record here | **TBD** |
| New SHA | Step 4 branch merge commit | **TBD** |
| `AI_LOCAL_ENRICH_ENABLED` effective | Explicit false; no unwanted local enrich | **TBD** |
| 2FA dedicated key present | No missing-key critical for 2FA path | **TBD** |
| Scoped cron secrets present | Dual-accept still works with `CRON_SECRET` callers | **TBD** |
| Ops probe `GET /api/health` | Auth OK; `infrastructure.redis` healthy | **PENDING_UNTIL_REDEPLOY_PROBE** |
| Natural Vercel crons | 2xx / auth success on ingest+pipeline+ops | **TBD** (observe) |
| Active null-tenant jobs | Remain 0 | **TBD** spot-check |
| Google CSE missing | Optional warn only | Acceptable |

## Probe constraints

- Workflow: `.github/workflows/step4-ops-probe.yml`
- Allowed: authenticated GET `/api/health`
- Forbidden for this probe: `fetch-news` or other mutating cron triggers

## Sign-off

| Role | Status |
|---|---|
| Env configured | Yes (Production) |
| Redeploy + probe | Pending |
| Natural cron observation | Pending |
| Overall Production verification | **Incomplete until redeploy + probe** |
