# Production Verification — Step 2

To be completed after deployment READY and ≥2 translation-backfill runs.

Checklist:

- [ ] Scheduler fires on new release
- [ ] Heartbeat fresh
- [ ] Valid jobs claimed (`processed > 0`)
- [ ] Completions > 0
- [ ] Queue depth decreases
- [ ] Oldest valid pending age improves
- [ ] No `urgencyScore` / new recurring `ReferenceError`
- [ ] No duplicate translations
- [ ] CG jobs remain excluded
- [ ] ≥1 Step 1 article receives required EN translation
- [ ] No unexpected publication flood
