# Remaining Blockers

## Observed (pre/post)

1. **`embed_signals` / `event_cluster` pending backlog** — feeder lanes are active but queued; may delay brand-new clusters. Does not block the 789 unused resolvable events already present.
2. **Stale dangling orphans** — remain in DB; excluded from auto window. Quarantine metadata is optional hygiene.
3. **30–40 published/day target** — requires 24–72h observation; not claimed from one deploy window.
4. **Step 2 translation recovery** — out of scope for Step 1.
