# Rollback plan — migration 034 (schema stabilization)

## Scope

Migration **034** is additive and idempotent. It does **not** drop production editorial or auth data. Rollback is rarely needed; prefer forward-fix migrations.

## What 034 changes

- Recreates `ingestion_logs`, `ingestion_failures`, `rss_source_health` (empty if recreated)
- Adds `intelligence_embeddings.embedding_json`, `updated_at`
- Normalizes RLS/grants on admin tables
- Adds `schema_registry`, `get_schema_health()`, `reload_postgrest_schema()`

## Safe rollback steps (if required)

1. **Do not** delete `tenant_memberships`, `generated_articles`, or `newsroom_tenants`.

2. Revert migration history row only (does not undo DDL):

   ```bash
   npx supabase migration repair --linked --status reverted 034
   ```

3. Optional DDL rollback (only if new tables cause issues):

   ```sql
   -- Only if ingestion tables were empty when created
   drop table if exists public.ingestion_failures;
   drop table if exists public.ingestion_logs;
   drop table if exists public.rss_source_health;

   alter table public.intelligence_embeddings
     drop column if exists embedding_json,
     drop column if exists updated_at;

   drop function if exists public.get_schema_health();
   drop table if exists public.schema_registry;

   notify pgrst, 'reload schema';
   ```

4. Redeploy previous app version if API depended on removed columns (unlikely).

## Data preserved

- All rows in `generated_articles`, `tenant_memberships`, `newsroom_tenants`, DAM, workflow, collaboration tables
- Auth users and sessions (unaffected)

## Forward fix preferred

If a single check fails after 034, add `038_fix_<issue>.sql` rather than reverting 034.
