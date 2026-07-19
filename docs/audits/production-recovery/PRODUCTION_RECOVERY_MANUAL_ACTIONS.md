# Production Recovery — Manual / External Actions

These were **not** completed in Phase 9. Do not treat them as done.

| Action | Platform | Variable / account | Reason | Current impact | Blocks production? | Code fallback exists? |
|---|---|---|---|---|---|---|
| Upgrade GNews plan or rotate key | GNews | `GNEWS_API_KEY` | Daily quota → HTTP 403 | Category API skipped; RSS/NewsData still ingest | No (degraded) | Yes — RSS + NewsData |
| Set `AI_LOCAL_ENRICH_ENABLED=false` explicitly | Vercel Production | `AI_LOCAL_ENRICH_ENABLED` | Env validation security warning | Startup warning; risk if defaults change | No if default stays off | Yes — validation warns |
| Add scoped cron secrets | Vercel Production | `CRON_INGEST_SECRET`, `CRON_PIPELINE_SECRET`, `CRON_OPS_SECRET`, `CRON_ADMIN_SECRET` | Reduce blast radius of shared secret | Uses legacy `CRON_SECRET` fallback | No | Yes — `CRON_SECRET` |
| Set dedicated 2FA encryption key | Vercel Production | `SECURITY_2FA_ENCRYPTION_KEY` | Avoid deriving from service role | Falls back to service role key | No for public site | Yes — fallback |
| Confirm/repair Upstash Redis | Upstash + Vercel | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Cache / rate-limit resilience | Homepage may hit DB more often | No | Yes — DB/live-feed path |
| Configure Google CSE (optional) | Google Cloud + Vercel | CSE credentials | SERP intelligence | SERP tracker disabled | No | Yes — optional |
| Restore decryptable local ops secrets | Operator machine / Vercel | Sensitive env decryption | CLI `env pull` returns empty Sensitive values | Phase 3/4 npm scripts cannot run locally | No (SQL drain used) | Ops via Supabase MCP / dashboard |
| Provide admin E2E credentials | Operator | Admin test user | Authenticated admin E2E not run in Phase 9 | E2E gap only | No | N/A |
| Continue bounded translation batches | Operator | `scripts/translation-recovery.ts` or SQL | 45 HI/EN still pending; 0 completions in window | Coverage lag | No | Worker + backfill |
| Drain embed/cluster dependency queues | Platform schedules | `embed_signals`, `event_cluster`, intelligence jobs | Generation skips `no_signals_for_event` | Generation publishes stalled | Soft blocker for new stories | Dedicated generate continues draining wakeups |
| Tenant job repair dry-run review | Operator | `scripts/tenant-job-repair.ts` | Phase 8 hygiene | Potential orphan tenant rows | No | Dry-run default |

## Does not block public site availability

Homepage, sitemap, and degraded ingestion are live. Manual actions above improve completeness, security posture, and generation yield — they do not undo Phase 9 deploy.
