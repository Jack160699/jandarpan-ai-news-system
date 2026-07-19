# Root Cause — Generation Yield Collapse

## Verdict

**Primary root cause:** batch editorial generation selected candidates from a **global urgency-ranked slice** of `news_events` without requiring that listed `signal_ids` still resolve in `news_signals`. Stale high-urgency events (often weeks old) with dangling signal references monopolized the candidate pool, so every wake-up job skipped its entire batch (`skipped=6`, `generated=0`).

## Evidence matrix

| Hypothesis | Finding |
|---|---|
| Identifier mismatch (event vs cluster) | **Not primary.** Canonical link is `news_events.signal_ids[]` → `news_signals.id`. |
| `sourceEventId` is wrong news_event | **By design.** Payload `sourceEventId` is `event_bus_messages.id` (wake-up), not a news event. Handler correctly runs batch generate. |
| Tenant mismatch | **Not observed** on pending wake-ups. |
| Relationship table missing inserts for fresh events | **Not primary.** All 799 events in last 7d have ≥1 resolvable signal. |
| Premature queueing | Wake-ups arrive after ingest; pool has 789 unused resolvable events. |
| Filtering / loadSignals returns empty | **Yes for selected orphans.** Listed IDs present; `news_signals` rows deleted/gone. |
| Backlog quality | Stale orphans should not auto-generate; they starved fresh work. |
| Completing skips as success | Wake-ups mark completed with zero yield, draining queue without publishing. |

## Smoking gun query

Top 40 by `urgency_score DESC`: **34 / 40** had `found_cnt = 0`, average age **~28 days**.

Meanwhile unused resolvable events in 7d: **789**.

## Failure path

1. Ingest completes → event bus enqueues `editorial_generate` wake-up.  
2. Dedicated cron claims wake-up → `generateEditorialsFromEvents({ limit })`.  
3. Query: `news_events` ordered by urgency, `limit * 20` (no freshness window).  
4. Top slice dominated by urgency=82–100 orphans with dead `signal_ids`.  
5. `loadSignalsForEvent` → `[]` → skip `no_signals_for_event` (× batch size).  
6. Job completes successfully with `generated=0`.  
7. Fresh events never reached.

## Why freshness score was insufficient

Priority scoring added at most ~120 for freshness but `urgency_score * 25` on orphans (up to 2500) overwhelmed age penalties until the hard 7-day demotion / window window was added.
