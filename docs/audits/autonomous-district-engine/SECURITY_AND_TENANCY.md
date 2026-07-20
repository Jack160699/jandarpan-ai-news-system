# Security and Tenancy

## Cron

- `verifyCronRequest` with `capability: "pipeline"` (same pattern as editorial / cleanup).
- No secrets in responses or docs.

## Database (066)

- Service role: full CRUD via RLS policies.
- Authenticated: read-only (admin-style, matching 065 simplicity).
- `gnews_quota_ledger` and `autonomous_rollout_state` are intentional globals (provider / rollout singletons).
- `district_coverage_daily` keyed by district_slug + day (tenant column not required for CG single-tenant shadow foundation).
- `article_evidence_ledger` keyed by article_id.

## Preserved

- Step 3 ingestion cursors / quota exhaustion path unchanged.
- Step 4 env validation / cron auth matrix unchanged.
- No reader-design worktree changes.
- No secret exposure in methodology page or JSON-LD helper.
