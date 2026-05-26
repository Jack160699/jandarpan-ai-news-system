# Production safety checklist (schema changes)

## Before push

- [ ] `npx supabase migration list` — local/remote in sync through latest applied
- [ ] No duplicate version prefixes (`033_foo.sql` + `033_bar.sql`)
- [ ] Migration is idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`)
- [ ] No `DROP TABLE` on editorial, auth, or tenant data
- [ ] Reviewed RLS: service_role policies on admin tables
- [ ] Reviewed grants: revoke anon/authenticated on sensitive tables

## Apply

```bash
cd newspaper-motion
npx supabase db push --linked --yes
```

Or paste `034_production_schema_stabilization.sql` in Supabase SQL Editor (single transaction).

## After push

- [ ] `npm run schema:verify` exits 0
- [ ] `select public.get_schema_health();` → `"ok": true`
- [ ] PostgREST reload: `select public.reload_postgrest_schema();` or POST `/api/admin/schema/health`
- [ ] `npm run build` succeeds
- [ ] Admin login + Team page loads (no schema cache errors)
- [ ] Workflow board, DAM, Intelligence panels load

## Verification matrix

| System | Route / action |
|--------|----------------|
| Admin login | `/admin/login` |
| RBAC / Team | `/admin/team` |
| Stories | `/admin/stories` |
| Workflow | `/admin/workflow` |
| DAM | `/admin/media` |
| Collaboration | `/admin/collaboration` |
| Intelligence | `/admin/intelligence` |
| Schema dashboard | `/admin/schema` (super_admin) |
| Ingestion | `/admin/ingestion` |

## Environment

- [ ] `SUPABASE_SERVICE_ROLE_KEY` only on server (Vercel / `.env.local`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` on client
- [ ] Optional: `SCHEMA_HEALTH_STARTUP=1` to log startup checks (default on in production via instrumentation)
