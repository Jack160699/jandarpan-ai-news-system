# ENVIRONMENT_BASELINE

**Step:** 4 — Environment & Security Hardening  
**Repo:** Jack160699/jandarpan-ai-news-system  
**Vercel project:** newspaper-motion (team: jack160699s-projects)  
**Production:** https://www.jandarpan.news  
**Working branch:** `fix/step4-environment-security-hardening`  
**Rollback branch:** `backup/before-step4-environment-security-hardening` @ `f23df88`  
**Rollback deployment:** `dpl_dqno1GZSPufCJJUVjCyfpuubWqiN` @ SHA `f23df88df3cd1fc323f13ebd03e9f09a0dc5e955`

## Prior state (Step 3)

- Step 3: **PASS**
- Incremental ingestion: live
- Migration `065`: applied
- `ingestion_source_state`: 22 rows
- RSS sources retired: 5

## Production environment changes

Values are never recorded here. Status only.

| Variable | Before | After |
|---|---|---|
| `AI_LOCAL_ENRICH_ENABLED` | missing | configured (explicit `false`) |
| `SECURITY_2FA_ENCRYPTION_KEY` | missing | configured |
| `CRON_INGEST_SECRET` | missing | configured |
| `CRON_PIPELINE_SECRET` | missing | configured |
| `CRON_OPS_SECRET` | missing | configured |
| `CRON_ADMIN_SECRET` | missing | configured |
| `CRON_SECRET` | configured | configured (preserved, not overwritten) |
| `UPSTASH_REDIS_REST_URL` | configured | configured (unchanged) |
| `UPSTASH_REDIS_REST_TOKEN` | configured | configured (unchanged) |

## Preview environment

- All-Preview scoped secrets / 2FA / `AI_LOCAL_ENRICH_ENABLED` add: **blocked** by Vercel CLI `git_branch_required` quirk in non-interactive mode.
- Branch-specific Preview add: **failed** because branch was not yet pushed.
- Documented as remaining limitation / **PARTIAL** for Preview env parity.
- **Production is the hardening target** for this step.

## Notes

- Env changes are not live until a Production redeploy.
- Current Production (pre–Step 4 redeploy): `dpl_dqno1GZSPufCJJUVjCyfpuubWqiN` @ `f23df88`.
- No secret values, tokens, or key material are stored in this document.
