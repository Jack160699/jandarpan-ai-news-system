# TENANT_HYGIENE

**Step:** 4 — Environment & Security Hardening  
**Focus:** Active jobs with null `tenant_id` and intentional global source-state keys.

## Job repair

| Metric | Value |
|---|---|
| Active null-tenant jobs repaired | 26 |
| Repair target tenant UUID | `00000000-0000-4000-8000-000000000003` (pipeline tenant) |
| Repair method | Deterministic assignment to pipeline tenant |
| Remaining active null-tenant jobs | **0** |

## `ingestion_source_state`

| Metric | Value |
|---|---|
| Total rows | 22 |
| Rows with `tenant_id` null | 22 |
| Interpretation | **Intentional global keys** — not errors |

Do not “fix” global `ingestion_source_state` null tenants as hygiene defects. They are shared/global source keys by design (aligned with Step 3 incremental ingestion posture).

## Verification checklist

- [x] Active null-tenant jobs → 0 after repair
- [x] Pipeline tenant UUID used consistently for repaired jobs
- [x] Source-state null tenants documented as intentional
- [ ] Post–Production redeploy: spot-check no new null-tenant **active** jobs accumulate unexpectedly

## Notes

- Step 3 context: migration `065` applied; 22 source-state rows; 5 RSS retired.
- Hygiene work here is data correction + documentation; not a schema change.
