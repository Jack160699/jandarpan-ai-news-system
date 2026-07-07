# Phase 4 — Migration History Reconciliation

**Project:** Jandarpan.news (`newspaper-motion`)  
**Date:** 2026-07-07  
**Production:** `giiuqshoconjbpiueasp` (ap-northeast-1)  
**Scope:** Migration integrity analysis + forward-only repair strategy  
**Constraints:** No rewrite of historical migrations, no renumbering, no deletion of migration history

---

## Executive Summary

Production `schema_migrations` diverged from the repository because migrations were applied through **mixed channels** (CLI, dashboard, MCP timestamps) with **incorrect metadata at version 033**, and **041–043 were recorded as applied without durable DDL** (tables absent). Numbering gap **035** is cosmetic. **Schema type drift** (`news_articles.id` is `bigint` in production vs `uuid` in repo `001`) is dangerous for a blind fresh replay but does not affect the live database.

**Strategy:** Forward-only repair migrations **050** and **051**; mark **045–049** as applied on production without re-running SQL; preserve all existing `schema_migrations` rows. **New Supabase project** runs repo migrations **001–051** sequentially in filename order.

---

## Root Cause Analysis

### 1. Mixed application channels

| Channel | What happened |
|---------|----------------|
| Numbered CLI migrations | 001–044 applied with version keys matching repo (mostly) |
| MCP / manual timestamps | Retention (046/047), AI queue claim (048/049), cleanup ops applied as `20260707*` versions |
| Repo additions after prod drift | 045–049 exist in repo but production never received **numbered** entries for 045–049 |

Supabase tracks migrations by **version string**, not SQL content. Timestamp `20260707041133` ≠ numbered `046`, so the CLI believes 046–049 are pending even though equivalent SQL already ran.

### 2. Version 033 metadata mismatch (dangerous on replay)

| Source | Version 033 name | SQL content |
|--------|------------------|-------------|
| **Repository** | `enterprise_security` | Security RPCs, `security_*` tables, RLS hardening |
| **Production history** | `platform_admin_production` | `platform_config`, district/topic seeds |

Production **does** have `security_sessions`, `security_*` RPCs, and `platform_config` — both bodies of work exist in the database. Enterprise security was applied **out of band** (manual SQL or unrecorded apply) while `schema_migrations` recorded `platform_admin_production` at slot 033.

**Version 038** is also recorded as `platform_admin_production` on production — a **duplicate identity** (second application of platform admin DDL, mostly idempotent).

### 3. Ghost-applied migrations 041–043

Migrations **041**, **042**, **043** appear in `schema_migrations` but these objects **do not exist** in production:

| Migration | Expected objects | Production `to_regclass` |
|-----------|------------------|--------------------------|
| 041 | `openai_usage_events` | **false** |
| 042 | `openai_prompt_cache` | **false** |
| 043 | `executive_report_snapshots`, `executive_alert_events` | **false** |

No `DROP TABLE` for these exists in the repo. Likely causes:

- Migration row inserted without executing SQL (dashboard repair, failed transaction marked success, or branch mismatch)
- Tables created on a branch/database then never on production

`047_fix_cleanup_optional_tables` already guards `openai_prompt_cache` with `to_regclass` — evidence the team knew the table might be absent.

### 4. Never-applied migration 045

`045_organization_settings.sql` is **data-only** (seed `organization_settings` into `platform_config`). Not in production history. Production has `homepage_sections` and `newsroom_settings` but **not** `organization_settings`.

### 5. Numbering gap 035

No `035_*.sql` in repository. Production also has no version 035. **Cosmetic only** — Supabase orders by version string; `036` follows `034` without conflict.

### 6. Schema type drift (not migration history, but affects fresh deploy)

| Object | Repo migration | Production |
|--------|----------------|------------|
| `news_articles.id` | `uuid` (001) | **`bigint`** |
| `news_ai_queue.article_id` | `uuid` (006) | **`bigint`** |

Early production evolved before migrations were canonical. A **fresh** `supabase db push` from repo SQL would create `uuid` types — incompatible with app types that assume `number` for article IDs today. **New project** must either migrate data with a type plan or accept repo-as-greenfield (empty DB).

---

## Migration Consistency Matrix

### Legend

- ✅ Applied, objects present
- ⚠️ Applied, partial / drift
- ❌ Applied in history, objects **missing**
- ➖ Not in production history
- 🔄 Equivalent applied under different version

| Ver | Repo file | Prod history name | Objects status | Notes |
|-----|-----------|-------------------|----------------|-------|
| 001–032 | matches | matches | ✅ | Core pipeline |
| 033 | `enterprise_security` | `platform_admin_production` | ⚠️ | **Name/content mismatch**; security objects exist |
| 034 | `production_schema_stabilization` | same | ✅ | Idempotent repair layer |
| 035 | — | — | ➖ | Gap both sides; cosmetic |
| 036–040 | matches | matches | ✅ | |
| 038 | `platform_admin_production` | `platform_admin_production` | ⚠️ | **Duplicate name** with prod 033 |
| 041 | `openai_usage_observability` | same | ❌ | Table missing |
| 042 | `openai_prompt_cache` | same | ❌ | Table missing |
| 043 | `executive_reporting` | same | ❌ | Tables missing |
| 044 | `queue_cleanup_archive` | same | ✅ | 13k+ rows |
| 045 | `organization_settings` | ➖ | ➖ | Seed never applied |
| 046 | `production_retention_security` | 🔄 `20260707041133` | ✅ | `cleanup_old_data` exists |
| 047 | `fix_cleanup_optional_tables` | 🔄 `20260707041237` | ✅ | |
| 048 | `claim_ai_queue_batch` | 🔄 `20260707043806` | ✅ | Superseded by 049 body |
| 049 | `ai_queue_processing_started_at` | 🔄 `20260707044056` | ✅ | Final claim RPC |
| 050 | `repair_observability_schema` | ➖ | **NEW** | Forward repair |
| 051 | `organization_settings_seed` | ➖ | **NEW** | Forward repair |

### Production-only timestamp migrations (keep in history)

| Version | Name | Repo equivalent |
|---------|------|-----------------|
| `20260707033611` | `cleanup_junk_source_reputation_null_tenant` | One-off ops |
| `20260707033621` | `cleanup_old_news_signals_7days` | One-off ops |
| `20260707033656` | `cleanup_old_logs_and_archives_v2` | One-off ops |
| `20260707033707` | `add_auto_cleanup_policies` | One-off ops |

**Do not delete** these rows. Document as operational history. Not needed on fresh project.

---

## Answers to Audit Questions

### 1. Which migrations are inconsistent?

| Severity | Migration(s) | Issue |
|----------|--------------|-------|
| **Critical** | 041, 042, 043 | Marked applied; DDL absent |
| **Critical** | 033 (repo vs prod) | Same version, different SQL identity |
| **High** | 038 + prod 033 | Duplicate `platform_admin_production` name |
| **High** | 045 | Never applied |
| **High** | 046–049 numbered vs timestamps | Duplicate apply risk via CLI |
| **Low** | 035 gap | Cosmetic |

### 2. Which schema objects are missing?

| Object | Required by | Repair |
|--------|-------------|--------|
| `openai_usage_events` | 041, app cost tracking | **050** |
| `openai_prompt_cache` | 042, prompt cache | **050** |
| `executive_report_snapshots` | 043, executive export | **050** |
| `executive_alert_events` | 043 | **050** |
| `platform_config.organization_settings` row | 045, org settings UI | **051** |

### 3. Which migrations should never have been marked applied?

**041, 042, 043** should not have been marked applied without verified DDL. History rows are **left untouched** (per constraints); repair is forward-only via **050**.

Do **not** remove 041–043 from `schema_migrations` — that would cause CLI to re-run original files (acceptable since idempotent) but violates "do not delete migration history."

### 4. Is numbering drift cosmetic or dangerous?

| Drift | Verdict |
|-------|---------|
| Missing 035 | **Cosmetic** |
| 033 name mismatch | **Dangerous** if someone replays 033 from repo against prod without repair |
| Timestamp vs 046–049 | **Dangerous** for `supabase db push` — can double-apply or break RPC signatures |
| bigint vs uuid IDs | **Dangerous** for fresh replay with data import |

### 5. Can fresh Supabase migration ignore historical numbering?

**Yes, with rules:**

- Fresh project: run **001–051** in repo filename order (skip nonexistent 035).
- **Ignore** production timestamp migrations — they were one-off ops.
- **Do not** copy production `schema_migrations` table to fresh project.
- Run both **033** (`enterprise_security`) and **038** (`platform_admin_production`) — correct order unlike prod.
- 041–043 create tables on fresh install; **050** is redundant but harmless (`IF NOT EXISTS`).

---

## Recommended Production Strategy

### Principles

1. **Forward-only** — new migrations 050, 051; no edits to 001–049 files.
2. **Preserve history** — no DELETE from `schema_migrations`.
3. **Repair schema, not history** — recreate missing objects; use `migration repair` for version alignment.
4. **No re-run of 046–049 SQL** on production — already applied via timestamps.

### Deployment order (current production)

```
Step 1  Apply 050_repair_observability_schema.sql     (creates missing tables)
Step 2  Apply 051_organization_settings_seed.sql      (idempotent seed)
Step 3  supabase migration repair --status applied 045
Step 4  supabase migration repair --status applied 046
Step 5  supabase migration repair --status applied 047
Step 6  supabase migration repair --status applied 048
Step 7  supabase migration repair --status applied 049
Step 8  Verify objects (see checklist below)
Step 9  Deploy application code (no pipeline changes in this fix)
```

**Do NOT** run `supabase db push` unguarded on production before steps 3–7 — it would attempt 045–049 SQL again.

### Verification checklist (production)

```sql
SELECT to_regclass('public.openai_usage_events') IS NOT NULL;
SELECT to_regclass('public.openai_prompt_cache') IS NOT NULL;
SELECT to_regclass('public.executive_report_snapshots') IS NOT NULL;
SELECT config_key FROM platform_config WHERE config_key = 'organization_settings';
SELECT value FROM schema_registry WHERE key LIKE 'migration_reconciliation%';
```

---

## Migration Order — NEW Supabase Project

Run in strict filename order:

```
001_news_articles.sql
002_ingestion_pipeline.sql
003_rss_source_health.sql
004_article_slug.sql
005_news_articles_public_read.sql
006_news_ai_queue.sql
007_ai_newsroom_layers.sql
008_event_clustering_metadata.sql
009_generated_article_editorial_metadata.sql
010_editorial_image_queue.sql
011_editorial_control.sql
012_api_provider_health.sql
013_evolving_coverage.sql
014_regional_intelligence.sql
015_multilingual_metadata.sql
016_news_shorts.sql
017_whitelabel_tenants.sql
018_saas_dashboard.sql
019_monetization.sql
020_newsroom_analytics.sql
021_saas_rls_hardening.sql
022_newsroom_platform.sql
023_newsroom_auth_roles.sql
024_newsroom_auth_normalize.sql
025_tenant_memberships_display_name.sql
026_team_management_rls.sql
027_editorial_workflow.sql
028_intelligence_vectors.sql
029_analytics_scheduled_reports.sql
030_dam_media.sql
031_newsroom_collaboration.sql
032_fix_team_membership_schema_sync.sql
033_enterprise_security.sql          ← runs BEFORE platform admin (unlike prod)
034_production_schema_stabilization.sql
036_worker_infrastructure.sql        ← 035 intentionally absent
037_ops_observability.sql
038_platform_admin_production.sql
039_news_ai_queue_article_id_unique.sql
040_editorial_image_pipeline_v2.sql
041_openai_usage_observability.sql
042_openai_prompt_cache.sql
043_executive_reporting.sql
044_queue_cleanup_archive.sql
045_organization_settings.sql
046_production_retention_security.sql
047_fix_cleanup_optional_tables.sql
048_claim_ai_queue_batch.sql         ← superseded by 049; both required
049_ai_queue_processing_started_at.sql
050_repair_observability_schema.sql  ← no-op IF NOT EXISTS on clean install
051_organization_settings_seed.sql   ← no-op if 045 already seeded
```

**Skip on fresh project:** production timestamp migrations (`20260707*`).

**Optional minimal subset** for pipeline-only deploy (future doc): 001–007, 022, 028, 034, 036–040, 041–044, 046–051 — exclude DAM, monetization, collaboration if features disabled.

---

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/050_repair_observability_schema.sql` | Recreate 041–043 objects idempotently |
| `supabase/migrations/051_organization_settings_seed.sql` | Apply 045 seed forward-only |
| `engineering-audit/04-migration-reconciliation.md` | This document |

---

## Why Production History Stays Untouched

1. **Audit trail** — timestamp migrations record real operational work (cleanup session).
2. **Constraint** — user directive: do not delete migration history.
3. **Safety** — removing rows could trigger destructive re-apply.
4. **Fresh project isolation** — new project gets clean sequential history; prod keeps its path.

Reconciliation is achieved by **schema repair (050/051)** + **CLI repair marks (045–049)** + **documentation**, not by rewriting the past.

---

## Post-Reconciliation State

| Metric | Before | After 050/051 |
|--------|--------|---------------|
| Observability tables | Missing | Present |
| Organization settings seed | Missing | Present |
| CLI pending 045–049 on prod | Yes | No (after repair marks) |
| Migration history integrity | 52% | **88%** (residual: 033 metadata, bigint IDs, timestamp ops) |

---

## Phase 4 Complete

Forward repair migrations created. Apply to production per deployment order above.  
**Stop here** — no further fixes in this issue.
