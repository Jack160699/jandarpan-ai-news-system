# Supabase deployment — schema stabilization (034+)

## Prerequisites

- Supabase CLI logged in: `npx supabase login`
- Project linked: `npx supabase link --project-ref giiuqshoconjbpiueasp`
- `.env.local` with service role key for local admin tests

## Deploy migrations (recommended)

```bash
cd newspaper-motion
npx supabase db push --linked --yes
```

Expected versions after deploy: through **037** (033 platform admin, 034 stabilization, 035 security, 036 workers, 037 ops).

## Manual SQL Editor deploy

If CLI unavailable, run in order:

1. `033_platform_admin_production.sql` (if not already applied)
2. `034_production_schema_stabilization.sql`
3. `035_enterprise_security.sql`
4. `036_worker_infrastructure.sql`
5. `037_ops_observability.sql`

End with:

```sql
select public.reload_postgrest_schema();
select public.get_schema_health();
```

## Post-deploy verification

```bash
npm run schema:verify
npm run build
```

## PostgREST cache

Stale cache symptoms: `Could not find column`, `schema cache`, PGRST204.

Fix:

```sql
select public.reload_postgrest_schema();
```

Or super_admin POST to `/api/admin/schema/health` from `/admin/schema`.

## Checksum reference

| Key | Value |
|-----|-------|
| `critical_tables_checksum_v1` | `8ef22387599b0312662be43394a78f30` |

Stored in `public.schema_registry` and `src/lib/supabase/schema-checksum.ts`.

## CI suggestion

```yaml
- run: npm run schema:verify
  working-directory: newspaper-motion
```

Requires `SUPABASE_ACCESS_TOKEN` and linked project in CI.
