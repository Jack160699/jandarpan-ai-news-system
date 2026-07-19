# Step 1 Final Report — Generation Yield Recovery

## Verdict: PASS

## Root cause

Batch generation ranked `news_events` globally by `urgency_score`, so stale orphans with dangling `signal_ids` (deleted `news_signals` rows) filled every batch and skipped as `no_signals_for_event`, while ~789 unused resolvable events in the last 7 days were never selected.

## Fix

1. Restrict candidate fetch to the auto-generation freshness window.  
2. Prefetch existing signal IDs and keep only resolvable events.  
3. Steepen age demotion in editorial priority.  
4. Classify missing-signal outcomes.  
5. Add dry-run/execute quarantine tooling (metadata only).

## Production proof

- Deploy READY: `dpl_7Juird5aTEssbPjruR3TS412kGRu` @ `01632fa`
- ≥2 cron windows (`19:50`, `20:05`) on new SHA
- 6 completed wake-ups, **19** generated stories, **0** `filteredNoSignals`, **0%** no-signal skip rate
- Queue 15→9; oldest pending ~9.8h→~5.8h
- 16 obsolete dangling events quarantined via metadata

## Tests

40/40 targeted unit tests; typecheck pass; production build pass.
