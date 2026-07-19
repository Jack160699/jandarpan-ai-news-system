# Data Repair Execution

## Batch

- Mode: execute (metadata quarantine only)
- Scope: non-live events older than 72h with dangling `signal_ids`
- Batch cap: 25
- Result: **16 quarantined** (`clustering_metadata.generation_yield_quarantine`)
- Deletes: 0
- Invented signal links: 0

## Notes

Quarantine is hygiene for obsolete orphans. Yield recovery did not depend on it — post-deploy jobs already showed `filteredNoSignals=0` before quarantine.
