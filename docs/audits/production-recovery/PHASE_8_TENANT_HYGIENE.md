# Phase 8 — Tenant Hygiene

## Problems addressed

- `enqueueJob` previously allowed `tenant_id: null`
- Translation / event-bus paths could create null-tenant jobs
- Some cache keys were global (segment micro-caches)
- Logs/heartbeats sometimes lacked tenant context on jobs

## Code fixes

1. **`resolveJobTenantId`** (`tenant-hygiene.ts`) — required job types resolve to pipeline default tenant when input missing
2. **`enqueueJob`** — always persists a resolved tenant; optional strict mode via `WORKER_REQUIRE_EXPLICIT_TENANT=true` rejects instead of fallback
3. **Segment caches** — keys `news:*:t:<slug>`; legacy global keys still readable
4. **Homepage invalidation** — deletes tenant-scoped segment keys

## Repair tooling (non-destructive)

```bash
npm run ops:tenant-job-repair          # dry-run
npm run ops:tenant-job-repair-execute  # apply
```

- Only `pending` / `claimed` rows with `tenant_id IS NULL`
- Sets `tenant_id` to pipeline default (`getPipelineTenantId()`)
- Does **not** rewrite completed/failed/dead history
- Batch limit 500 per run

## Manual follow-up

1. Dry-run repair against production DB after deploy
2. Review sample job types before `--execute`
3. Confirm no duplicate cross-tenant dedupe collisions after backfill
