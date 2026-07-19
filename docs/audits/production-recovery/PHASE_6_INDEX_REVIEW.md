# Phase 6 — Index Review

## Existing indexes (retained)

| Index | Purpose | Action |
|---|---|---|
| `generated_articles_published_at_idx` | General published_at order | Keep |
| `generated_articles_editorial_status_idx` | Status + published_at | Keep |
| `generated_articles_slug_unique` | Story lookup | Keep |
| `news_ai_queue_status_created_idx` | Queue drain | Keep (no add) |
| `idx_worker_jobs_*` (036/062) | Worker claim / type | Keep (no add) |

## Added in `064_generated_pool_query_indexes.sql`

| Index | Definition | Justification |
|---|---|---|
| `idx_generated_articles_public_published_at` | `(published_at DESC) WHERE published_at IS NOT NULL AND editorial_status IN ('approved','published','live')` | Matches pool / sitemap / Google News filter + ORDER BY |
| `idx_generated_articles_pending_created_at` | `(created_at DESC) WHERE editorial_status = 'pending'` | Matches pending head-count / desk listing |

## Explicitly not added

| Candidate | Why skipped |
|---|---|
| Tenant + status + published_at | Public anon pool does not filter `tenant_id`; tenant index already exists |
| Worker type + heartbeat | Covered by existing worker / presence indexes |
| Canonical/source fingerprint | No hot read path in this phase |
| Duplicate `(editorial_status, published_at)` | Already present from migration 011 |
| `CREATE INDEX CONCURRENTLY` | Migrations run in transactions — unsafe |

## Migration safety

- Forward-only `CREATE INDEX IF NOT EXISTS`
- Non-destructive (no drops, no data rewrites)
- Idempotent re-apply safe
- Not applied to production in this phase (local commit only)
