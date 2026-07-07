# Phase 2 — Database Architecture Audit

**Project:** Jandarpan.news (`newspaper-motion`)  
**Date:** 2026-07-07  
**Scope:** READ-ONLY review of migrations, schema, RPCs, RLS, indexes, and repository query patterns  
**Production project:** `giiuqshoconjbpiueasp` (ap-northeast-1)  
**Phase 1:** Complete — not repeated here

---

## Executive Summary

The production database has **~75 public tables**, ~**210 MB** of user data (excluding dead tuple bloat), and **46 numbered migrations** in the repository plus **6 timestamped migrations** applied only on production. There is **critical migration history drift** between the repo and production, and **three tables referenced by application code do not exist** in production despite their migrations being marked applied.

The schema is functionally rich but carries legacy debt: a deprecated `tenants` table, ~**20 empty feature tables**, **~12 MB of unused indexes**, and several **N+1 query patterns** in queue audit and translation coverage code. Retention is now automated via `cleanup_old_data()` but `news_signals` still shows **75 MB physical size** with only **12,421 rows** (dead tuple bloat — VACUUM FULL needed at migration window).

**No database changes were made in this phase.**

---

## Methodology

1. Enumerated all `supabase/migrations/*.sql` (001–047, gap at 035).
2. Queried production via Supabase MCP: table sizes, indexes, functions, triggers, extensions, RLS policies, migration history.
3. Cross-referenced `src/**/*.ts` for `.from("table")` and `.rpc("function")` usage.
4. Compared `src/types/supabase.ts` and `src/types/database.generated.ts` against live `information_schema`.
5. Ran Supabase performance and security advisors.

---

## Production Snapshot (2026-07-07)

| Metric | Value |
|--------|-------|
| Public tables | ~75 |
| Largest table | `news_signals` — 75 MB (12,421 rows) |
| Second largest | `intelligence_snapshots` — 49 MB (928 rows, ~51 KB avg JSON row) |
| Third largest | `news_articles` — 46 MB (15,057 rows) |
| Views | 0 |
| User triggers | 1 (`trg_tenant_memberships_updated_at`) |
| App-defined RPCs | 7 (`cleanup_old_data`, `claim_editorial_image_batch`, `get_schema_health`, `reload_postgrest_schema`, `match_intelligence_embeddings`, `security_*` ×3) |
| Extensions in `public` | `vector` (pgvector) |

---

## Findings

### Migration & Schema Integrity

| # | File path | Database object | Severity | Risk | Recommended fix | Implemented |
|---|-----------|-----------------|----------|------|-----------------|-------------|
| M1 | `supabase/migrations/033_enterprise_security.sql` vs production `schema_migrations` | Migration **033** | **Critical** | High | Local file is `enterprise_security`; production records `033 = platform_admin_production`. Content diverged — fresh `db push` will mis-apply or skip security tables. Reconcile migration history before new-project migration. | No |
| M2 | `supabase/migrations/038_platform_admin_production.sql` vs production | Migration **038** | **Critical** | High | Production has **two** migrations named `platform_admin_production` (versions 033 and 038). Repo only has 038. Audit which SQL actually ran on production. | No |
| M3 | `supabase/migrations/` (missing `035_*.sql`) | Migration sequence gap | High | Medium | Numbering gap 034→036 causes confusion. Either add placeholder doc or renumber in migration manifest for fresh deploys. | No |
| M4 | `supabase/migrations/045_organization_settings.sql` vs `supabase_migrations.schema_migrations` | Migration **045** | High | Low | **Not applied** on production. Organization settings seed may be missing; verify `platform_config` row for `organization_settings`. | No |
| M5 | Production-only timestamp migrations | `20260707*` (6 migrations) | High | Medium | Cleanup/retention SQL applied via MCP with timestamp names, not in repo as numbered 046/047 until later. Repo now has `046_*` and `047_*` but production history uses timestamps — **duplicate apply risk** on fresh link. Normalize to single canonical migration set before migration. | No |
| M6 | `supabase/migrations/041_openai_usage_observability.sql` | `openai_usage_events` | **Critical** | High | Migration **041 marked applied** but table **does not exist** in production (`EXISTS = false`). All cost observability inserts fail silently. Re-apply DDL on new project; investigate drop on current. | No |
| M7 | `supabase/migrations/042_openai_prompt_cache.sql` | `openai_prompt_cache` | **Critical** | High | Migration **042 marked applied** but table **missing**. Prompt cache lookups fail every call; duplicate OpenAI spend. | No |
| M8 | `supabase/migrations/043_executive_reporting.sql` | `executive_report_snapshots` | **Critical** | Medium | Migration **043 marked applied** but table **missing**. Executive export route inserts will fail. | No |
| M9 | `supabase/migrations/006_news_ai_queue.sql` + `039_news_ai_queue_article_id_unique.sql` | `news_ai_queue` indexes | Medium | Low | Duplicate indexes on `article_id`: `news_ai_queue_article_idx` (non-unique) + `idx_news_ai_queue_article_id_unique` (unique). Drop non-unique redundant index. | No |
| M10 | `supabase/migrations/006_news_ai_queue.sql` | `news_ai_queue_status_created_idx` | Medium | Low | Production has `news_ai_queue_status_idx` on `(status)` only — missing `created_at` composite from migration. Queue drain queries less efficient. | No |
| M11 | `supabase/migrations/034_production_schema_stabilization.sql` | Idempotent re-create pattern | Medium | Medium | Large stabilization migration re-creates objects if missing — can mask migration drift. Document as source of truth for tables that exist without matching migration version. | No |

---

### Repository ↔ Database Mismatches

| # | File path | Database object | Severity | Risk | Recommended fix | Implemented |
|---|-----------|-----------------|----------|------|-----------------|-------------|
| R1 | `src/lib/observability/openai-cost/record.ts` | `openai_usage_events` | **Critical** | High | Inserts to missing table; caught in try/catch — **silent data loss** for all OpenAI cost tracking. | No |
| R2 | `src/lib/observability/openai-cost/prompt-cache.ts` | `openai_prompt_cache` | **Critical** | High | Cache never hits; every prompt hits OpenAI. | No |
| R3 | `src/lib/observability/openai-cost/dashboard.ts`, `financial-dashboard.ts`, `executive-dashboard.ts` | `openai_usage_events` | **Critical** | High | Dashboards return empty aggregates. | No |
| R4 | `src/app/api/admin/ops/executive/export/route.ts` | `executive_report_snapshots` | High | Medium | Export snapshot persistence fails. | No |
| R5 | `src/lib/ops/data-retention.ts` | RPC `cleanup_old_data` | Medium | Low | RPC exists and works but **not in** `database.generated.ts` / typed RPC union — uses `as unknown` cast. Regenerate types after migration reconcile. | No |
| R6 | `src/types/supabase.ts` + `src/types/database.generated.ts` | Type definitions | Medium | Medium | Two parallel generated type files; `supabase.ts` includes tables absent from production. Consolidate to single generated source. | No |
| R7 | `src/lib/ops/queue-cleanup.ts:747` | `queue_cleanup_archive` | Low | Low | Type hack: `.from("queue_cleanup_archive" as "worker_jobs")` — indicates types out of sync with schema. | No |
| R8 | `supabase/migrations/017_whitelabel_tenants.sql` + DB comment | `tenants` | Medium | Low | Legacy table (1 row); **zero** `.from("tenants")` in app. App uses `newsroom_tenants`. Safe to exclude from fresh migration. | No |
| R9 | `src/lib/organization/settings.ts` | `platform_config.organization_settings` | Medium | Low | Depends on migration 045 seed; may be absent on production. Verify config row exists. | No |

---

### Unused / Dormant Tables (0 rows in production)

Tables exist with schema + RLS but **no production data**. Code may still reference them for feature scaffolding.

| Table | Rows | Code references | Severity | Risk | Recommended fix |
|-------|------|-----------------|----------|------|-----------------|
| `platform_articles` | 0 | `lib/platform-admin/articles.ts`, `lib/newsroom-platform/db/queries.ts` | Medium | Low | Unified with `generated_articles` in UI — consider deprecating table or seeding |
| `dam_assets`, `dam_folders`, `dam_asset_variants`, `dam_analyze_queue` | 0 | `lib/dam/store.ts`, job handlers | Low | Low | Feature dormant; keep for migration or exclude |
| `newsroom_chat_messages`, `newsroom_approval_requests`, `newsroom_inline_comments` | 0 | `lib/collaboration/store.ts` | Low | Low | Collaboration feature unused in prod |
| `newsroom_editor_locks` | 0 | Schema health critical list | Low | Low | OK to keep |
| `sponsored_stories`, `affiliate_placements`, `premium_reports`, `newsletters`, `newsletter_subscribers`, `reader_plans`, `reader_subscriptions` | 0 | Monetization libs + seed route | Low | Low | Monetization scaffolding |
| `analytics_report_schedules`, `breaking_velocity_snapshots` | 0 | Migrations only | Low | Low | Exclude from minimal migration |
| `platform_breaking_news`, `platform_ai_logs` | 0 | Types only | Low | Low | Exclude or implement |
| `ingestion_failures` | 0 | Dashboard/debug queries | Low | Low | OK — event-driven |
| `user_two_factor` | 0 | Security API routes | Low | Medium | 2FA backend ready, no UI |
| `ops_error_events`, `ops_cron_runs` | 0 | Observability (recently cleaned) | Low | Low | Expected after retention run |

**Not unused:** `news_shorts` is not a table — migration `016` adds `shorts_metadata` JSONB column on `generated_articles` only.

---

### Indexes

| # | File path | Database object | Severity | Risk | Recommended fix | Implemented |
|---|-----------|-----------------|----------|------|-----------------|-------------|
| I1 | Production `pg_stat_user_indexes` | `news_events_clustering_metadata_idx` (3.9 MB, 0 scans) | High | Medium | Drop after 30-day monitoring if still unused; saves write amplification on clustering updates | No |
| I2 | Production | `news_articles_slug_lookup_idx` (2.1 MB, 0 scans) | High | Medium | App uses `.eq("slug")` / `.ilike` — verify query plan; may need different index or drop | No |
| I3 | Production | `generated_articles_editorial_metadata_idx` (1.7 MB, 0 scans) | Medium | Low | GIN on JSONB unused; drop if admin filters don't use it | No |
| I4 | Production | `source_reputation_memory_pkey` (1.2 MB, 0 scans) | Medium | Low | Table has 139 rows but PK never scanned — lookups may use tenant+source unique instead | No |
| I5 | Production | `idx_intelligence_embeddings_vector` (808 KB, 0 scans) | Medium | Low | IVFFlat index unused — 0 embedding rows. App uses `embedding_json` + JS cosine fallback in `vector-store.ts` | No |
| I6 | `supabase/migrations/046_production_retention_security.sql` | `idx_news_signals_retention` | Low | Low | New index; redundant with `news_signals_created_at_idx` — monitor | No |
| I7 | Supabase performance advisor | 33 unindexed foreign keys | Medium | Low | Add indexes on hot FK paths: `news_signals.tenant_id`, `news_events.tenant_id`, `worker_dead_letters.job_id` | No |
| I8 | Production | Duplicate index pair on `news_ai_queue.article_id` | Medium | Low | See M9 — drop `news_ai_queue_article_idx` | No |

**Duplicate indexes (same columns):** None detected via `pg_index` column-set comparison.

**Missing indexes (high value):**

| Table | Column(s) | Used by | Severity |
|-------|-----------|---------|----------|
| `generated_articles` | `(workflow_status, published_at)` WHERE published | Homepage pool `fetchGeneratedArticlePool` | Medium |
| `news_ai_queue` | `(status, created_at)` | `lib/news/ai/queue.ts` pending drain | Medium |
| `worker_jobs` | `(job_type, status)` | Translation queue audit | Medium |
| `intelligence_snapshots` | `(built_at DESC)` | Retention cleanup | Low (added in 046, verify applied) |

---

### RLS, Security & RPCs

| # | File path | Database object | Severity | Risk | Recommended fix | Implemented |
|---|-----------|-----------------|----------|------|-----------------|-------------|
| S1 | `supabase/migrations/033_enterprise_security.sql` | `security_is_super_admin`, `security_user_has_tenant`, `security_user_tenant_ids` | High | Medium | SECURITY DEFINER RPCs callable by `authenticated` — required for RLS but expands attack surface. Document; restrict to RLS-only usage. | No |
| S2 | `supabase/migrations/046_production_retention_security.sql` | `cleanup_old_data`, `claim_editorial_image_batch`, `get_schema_health`, `reload_postgrest_schema` | High | Low | Correctly revoked from `anon`; service_role only. Good for migration. | No |
| S3 | Production `tenants` | RLS deny policies | Low | Low | Legacy table locked down; OK | No |
| S4 | Production | `vector` extension in `public` | Medium | Low | Supabase linter warns — move to `extensions` schema on fresh project | No |
| S5 | Auth config | Leaked password protection disabled | Medium | Low | Enable in Supabase Auth dashboard | No |
| S6 | `supabase/migrations/021_saas_rls_hardening.sql` et al. | Multiple permissive RLS on platform tables | Low | Low | Duplicate read policies removed in 046 for 4 platform tables; verify no regressions | No |
| S7 | `src/lib/intelligence/vector/vector-store.ts` | `match_intelligence_embeddings` | Low | Low | RPC used correctly; table empty so never hit in prod | No |
| S8 | `src/lib/news/ai/editorial-image-queue.ts` | `claim_editorial_image_batch` | Low | Low | RPC used via service role — correct pattern | No |

**Unused RPCs in application code:** None of the 7 app RPCs are dead — all have callers. Vector extension adds ~100 system functions in `public` (normal for pgvector).

---

### Large JSON / Text Columns

| Table | Column | Avg size | Max / notes | Severity | Archive? |
|-------|--------|----------|-------------|----------|----------|
| `intelligence_snapshots` | `snapshot` | **51 KB** | 73 KB | High | Yes — 30-day retention in `cleanup_old_data` |
| `news_signals` | `raw_content` | 366 B | 4.3 KB | Medium | Table bloat is dead tuples, not column size |
| `news_signals` | `ingestion_metadata` | 250 B | — | Low | 7-day retention |
| `generated_articles` | `translations` | 62 B | — | Low | Grows with multilingual backfill |
| `generated_articles` | `article_body`, `editorial_metadata` | text/jsonb | Full story content | Low | Soft-archive via `workflow_status` after 90d |
| `analytics_snapshots` | `snapshot` | jsonb | 1 row | Low | OK |
| `queue_cleanup_archive` | `payload` | jsonb | 13,884 rows, 4 MB | Medium | 30-day retention |

---

### Partitioning & Archival Candidates

| Table | Size | Rows | Partition? | Archive strategy |
|-------|------|------|------------|------------------|
| `news_signals` | 75 MB | 12,421 | **Yes** — monthly by `created_at` when >100k rows | 7-day DELETE (automated) + VACUUM FULL |
| `ingestion_logs` | 4.4 MB | 1,529 | Yes — monthly | 14-day DELETE |
| `worker_job_runs` | 2.3 MB | 4,072 | Yes — monthly | 14-day DELETE |
| `intelligence_snapshots` | 49 MB | 928 | Optional — low row count, huge rows | 30-day DELETE |
| `queue_cleanup_archive` | 4 MB | 13,884 | Optional | 30-day DELETE |
| `reader_analytics_events` | 152 KB | 129 | Future — at scale | 90-day DELETE (not yet in RPC) |
| `news_articles` | 46 MB | 15,057 | No — active wire pool | Keep; dedupe at ingest |

---

### Query Patterns & Performance

| # | File path | Pattern | Severity | Risk | Recommended fix | Implemented |
|---|-----------|---------|----------|------|-----------------|-------------|
| Q1 | `src/lib/ops/queue-cleanup.ts:106-121` | **N+1 counts** — 8 separate `count` queries per queue table (statuses) | High | Low | Replace with single `SELECT status, count(*) GROUP BY status` RPC or raw SQL | No |
| Q2 | `src/lib/i18n/multilingual/translation-queue.ts:192-227` | **6 sequential count queries** on `worker_jobs` for audit | Medium | Low | Consolidate into one grouped query | No |
| Q3 | `src/lib/editorial-workflow/store.ts:31-74` | Articles fetch + **second query** for assignee emails | Medium | Low | JOIN or single query with membership lookup map | No |
| Q4 | `src/lib/news/ai/generate-editorial-image.ts:821-901` | Batch articles then **per-batch** events + signals fetches | Medium | Low | Acceptable with `.in()` but uses `select("*")` — narrow columns | No |
| Q5 | `src/lib/observability/executive-dashboard.ts` | Multiple `generated_articles` queries in one dashboard load | Medium | Low | Combine into fewer round-trips or materialized view | No |
| Q6 | `src/lib/editorial-dashboard/fetch-dashboard.ts` | 10 parallel queries (good) but each `select("*")` | Low | Low | Narrow column selects for dashboard metrics | No |
| Q7 | `src/lib/newsroom/generated/read.ts:100-106` | Homepage pool: single query, 280 rows — **good pattern** | — | — | Add `.neq("workflow_status","archived")` at DB level | No |
| Q8 | `src/lib/news-db.ts` | Legacy wire pool — 280 rows `EXTENDED_ARTICLE_SELECT` | Medium | Low | Dual feed paths (`news_articles` + `generated_articles`) increase total DB load | No |
| Q9 | `src/lib/infrastructure/jobs/monitor.ts:108-135` | Health check: 8 parallel count/head queries | Low | Low | Acceptable for hourly health cron | No |
| Q10 | Multiple files | Widespread `select("*")` | Medium | Low | Increases payload over wire; especially `generate-article.ts`, `process.ts` | No |

---

### Triggers, Views, Constraints

| Object | Status | Notes |
|--------|--------|-------|
| Views | **None** in `public` | All reads hit base tables |
| Triggers | **1** — `trg_tenant_memberships_updated_at` on `tenant_memberships` | OK |
| `cleanup_old_data()` bug (fixed in 047) | Was using `created_at` on `intelligence_snapshots` | Production uses `built_at` — fixed in applied migration 047 |
| FK `news_signals` → `newsroom_tenants` | No index on `tenant_id` | Performance advisor flagged |
| Unique constraints | `news_signals.article_url`, `generated_articles.slug`, `news_ai_queue.article_id` | Working as dedup guards |

---

### Supabase Client Usage

| Pattern | Files | Assessment |
|---------|-------|------------|
| `createAdminServerClient()` | Pipeline, cron, ops | Correct for writes/RLS-bypass |
| `createAnonServerClient()` | Homepage, public reads | Correct for RLS-enforced reads |
| Service role in API routes | Most `/api/admin/*`, cron | Correct |
| Mixed `createAdminClient` alias | `queue-cleanup.ts`, `data-retention.ts` | Same as admin — OK |
| Browser client | `useSupabase` hook | Reader account only — OK |

No repository code references dropped tables from prior cleanup (e.g. `job_runs` old name). `worker_job_runs` is correct.

---

## Migration Inventory (Repository)

| Range | Count | Notes |
|-------|-------|-------|
| 001–034 | 34 files | Core pipeline through stabilization |
| **035** | **Missing** | Gap in sequence |
| 036–047 | 11 files | Workers, ops, platform, retention |
| **Production extras** | 6 timestamp migrations | Cleanup session; not numbered in early deploy |

**Idempotent migrations:** 034, 046, 047 use `IF NOT EXISTS` / `DROP IF EXISTS` heavily — safe to re-run but obscure drift.

**Dead migrations:** None fully dead — all contribute to current schema or seed data. **Conflicting:** 033 local vs production (see M1).

---

## RPC Reference Map

| RPC | Migration | Called from | Production |
|-----|-----------|-------------|------------|
| `cleanup_old_data()` | 046/047 + timestamps | `src/lib/ops/data-retention.ts` | ✅ Exists, returns jsonb |
| `claim_editorial_image_batch(int)` | 040 | `src/lib/news/ai/editorial-image-queue.ts` | ✅ Exists |
| `get_schema_health()` | 034 | `src/lib/supabase/schema-health.ts` | ✅ Exists |
| `reload_postgrest_schema()` | 034 | `src/lib/supabase/reload-schema.ts` | ✅ Exists |
| `match_intelligence_embeddings(...)` | 028 | `src/lib/intelligence/vector/vector-store.ts` | ✅ Exists (0 rows) |
| `security_user_tenant_ids()` | 033 | RLS policies only | ✅ Exists |
| `security_is_super_admin(uuid)` | 033 | RLS policies only | ✅ Exists |
| `security_user_has_tenant(uuid)` | 033 | RLS policies only | ✅ Exists |

---

## Priority Summary

### Critical Issues

1. **M1/M2 — Migration history drift:** Local `033_enterprise_security.sql` ≠ production `033_platform_admin_production`. Two production migrations share the same name. Blocks clean migration to new Supabase project without manual reconciliation.
2. **M6/M7/M8 — Missing tables with applied migrations:** `openai_usage_events`, `openai_prompt_cache`, `executive_report_snapshots` do not exist despite migrations 041–043 recorded as applied.
3. **R1/R2/R3 — Silent application failures:** OpenAI cost tracking and prompt cache are non-functional in production; errors swallowed in `record.ts` try/catch.

### High Priority

4. **M4 — Migration 045 not applied:** Organization settings seed may be missing.
5. **M5 — Timestamp vs numbered migration duplication:** 046/047 in repo vs `20260707*` on production — reconcile before fresh deploy.
6. **I1/I2 — ~6 MB unused indexes** on `news_events` and `news_articles` with zero scans.
7. **S1 — SECURITY DEFINER RPCs** exposed to authenticated role (RLS helpers).
8. **Q1 — Queue cleanup N+1** count pattern (8 queries × 4 tables per audit).
9. **`news_signals` 75 MB bloat** — dead tuples; VACUUM FULL at maintenance window (not a code issue).
10. **`intelligence_snapshots`** — 49 MB for 928 rows (~51 KB JSON each); retention helps but table design is heavy.

### Medium Priority

11. Duplicate/redundant `news_ai_queue` indexes (M9, I8).
12. Missing composite indexes on `worker_jobs`, `generated_articles` workflow queries (I7).
13. 33 unindexed foreign keys (performance advisor).
14. ~20 empty feature tables — simplify schema for fresh migration.
15. Legacy `tenants` table — exclude from new project.
16. Dual type files (`supabase.ts` vs `database.generated.ts`).
17. Widespread `select("*")` in pipeline code.
18. `vector` extension in `public` schema.
19. Translation audit sequential counts (Q2).
20. `platform_articles` (0 rows) still in active code paths.

### Low Priority

21. Migration numbering gap 035.
22. `queue_cleanup_archive` type cast hack in queue-cleanup.
23. `news_ai_queue_status_idx` missing `created_at` (M10).
24. `reader_analytics_events` not in retention RPC yet.
25. Auth leaked-password protection disabled.
26. Redundant retention index on `news_signals` (I6).
27. `ingestion_failures` empty but monitored — OK.

---

## Fresh Supabase Migration Readiness (Database)

| Criterion | Status |
|-----------|--------|
| Canonical migration set | ⚠️ Drift — reconcile 033/038/timestamps |
| All code-referenced tables exist | ❌ 3 missing |
| Types match production | ❌ |
| RLS complete | ✅ Mostly good |
| Retention automated | ✅ `cleanup_old_data` |
| Index hygiene | ⚠️ ~12 MB unused |
| Empty table pruning plan | ❌ Not documented |
| Query patterns optimized | ⚠️ N+1 in ops code |

**Database migration readiness score: 52%** (blocked primarily by migration drift and missing observability tables)

---

## Recommended Phase 3 Actions (Not Performed Here)

1. Export canonical schema via `pg_dump --schema-only` from reconciled production.
2. Build minimal migration set for new project (exclude empty feature tables).
3. Re-apply 041–043 DDL and verify tables exist.
4. Run `npm run supabase:types` against new project.
5. Add grouped-count SQL for queue audit.
6. VACUUM FULL `news_signals` during maintenance window on current project.

---

## Phase 2 Complete

No database modifications, migrations, or SQL were generated or applied.  
**Stop here.** Phase 3 (implementation) not started per instructions.
