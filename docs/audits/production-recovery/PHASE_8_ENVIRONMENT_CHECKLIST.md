# Phase 8 — Environment Checklist

Values are never printed. Confirm presence/absence in Vercel → Project → Settings → Environment Variables (Production).

CLI note: `vercel env ls` was unavailable from this worktree (project not linked). Use the Dashboard or `vercel link` then `vercel env ls production`.

## Required (platform)

| Name | Present? | Action if missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ☐ | Set from Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ☐ | Set anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ☐ | Set service role (server-only) |
| `CRON_SECRET` | ☐ | `openssl rand -hex 32` — keep until scoped migration complete |
| `NEWSROOM_SUPER_ADMIN_EMAILS` | ☐ | Comma-separated bootstrap admins |
| `NEXT_PUBLIC_SITE_URL` | ☐ | `https://www.jandarpan.news` |

## Security (recommended)

| Name | Present? | Action |
|---|---|---|
| `SECURITY_2FA_ENCRYPTION_KEY` | ☐ | Dedicated key; do not reuse service role |
| `AI_LOCAL_ENRICH_ENABLED` | ☐ | Must be `false` in production |
| `CRON_INGEST_SECRET` | ☐ | Scoped ingest callers |
| `CRON_PIPELINE_SECRET` | ☐ | Scoped pipeline callers |
| `CRON_OPS_SECRET` | ☐ | Scoped ops (competitor/SEO/etc.) |
| `CRON_ADMIN_SECRET` | ☐ | Scoped admin cron |

## Optional integrations (warn only — not Critical)

| Name | Present? | Notes |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | ☐ | Pair with token |
| `UPSTASH_REDIS_REST_TOKEN` | ☐ | Never log |
| `GOOGLE_CSE_API_KEY` | ☐ | SERP optional |
| `GOOGLE_CSE_CX` | ☐ | SERP optional |
| `OPENAI_API_KEY` / `OPENROUTER_API_KEY` | ☐ | Editorial AI |
| `QSTASH_*` signing keys | ☐ | If QStash schedules used |
| `SEO_COMPETITOR_TRACKER` | ☐ | Set `true` to enable competitor cron |

## Safe updates via tooling

Only update production variables when:

1. Name matches this checklist exactly
2. Scope is Production (and Preview if intentional)
3. Value is generated/rotated offline — never pasted into chat logs

No production env mutations were performed in Phase 8.
