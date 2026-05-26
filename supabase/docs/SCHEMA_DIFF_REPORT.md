# Schema diff report (production audit — 2026-05-26)

## Executive summary

Migration history (`001`–`032`) was **fully recorded** on production, but several objects were **missing or incomplete**. This is classic “applied migration row without durable DDL” drift—often from partial applies, manual drops, or duplicate `033_*` version collisions.

**Resolution:** `034_production_schema_stabilization.sql` applied to linked project `giiuqshoconjbpiueasp`. Post-apply `get_schema_health()` returns **ok: true** with checksum `8ef22387599b0312662be43394a78f30`.

## Drift found (pre-034)

| Area | Expected (local migrations) | Production (before 034) | Severity |
|------|----------------------------|-------------------------|----------|
| `ingestion_logs` | 002 | **Missing table** | High |
| `ingestion_failures` | 002 | **Missing table** | High |
| `rss_source_health` | 003 | **Missing table** | High |
| `intelligence_embeddings.embedding_json` | 028 | **Missing column** | High |
| `intelligence_embeddings.updated_at` | 028 | **Missing column** | Medium |
| `tenant_memberships` grants | 021 RLS | anon had ALL privileges (RLS blocked writes) | Medium |
| Legacy `tenants` table | N/A | Present (orphan pre-017) | Info |
| Duplicate `033_*` files | One version each | 4 files shared version `033` | Critical (blocked push) |

## Confirmed OK (pre-034)

- `tenant_memberships`: `display_name`, `avatar_url`, `permissions`, `metadata`, `joined_at`
- `generated_articles`: all `workflow_*` columns
- `editorial_workflow_events`, `dam_assets`, `newsroom_editor_locks`, `reader_analytics_events`
- RLS enabled on critical tables
- `reload_postgrest_schema()`, `match_intelligence_embeddings()`, `vector` extension
- FK `tenant_memberships_user_id_fkey` validated (0 orphans)

## Post-034 state

All critical checks pass via `public.get_schema_health()`:

- Tables: ingestion pipeline, tenant, workflow, intelligence, DAM, collaboration, analytics
- Columns: `display_name`, `embedding_json`, `workflow_status`
- Functions: `reload_postgrest_schema`, `get_schema_health`
- Extension: `pgvector`

## Type generation gap

Hand-maintained `src/lib/supabase/types.ts` does not include tables added in `027`–`031` (workflow, DAM, collaboration). Run `npm run supabase:types` after CLI link to regenerate `database.generated.ts` and merge types.

## Recommendations

1. Run `npm run schema:verify` after every production migration push.
2. Open `/admin/schema` (super_admin) for live dashboard.
3. Never use duplicate migration version prefixes (`033_a.sql`, `033_b.sql`).
4. Call `reloadPostgrestSchema()` after DDL in deploy scripts.
