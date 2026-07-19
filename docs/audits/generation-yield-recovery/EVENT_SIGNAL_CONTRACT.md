# Event ↔ Signal Contract

## Canonical source of truth

- Table: `news_events`
- Field: `signal_ids uuid[]`
- Load path: `loadSignalsForEvent` → `news_signals` where `id in signal_ids`
- Clustering write path: `event-clustering.ts` sets `signal_ids` from cluster members

There is **no** separate `event_signals` membership table in production.

## Generation eligibility (post-fix)

1. Prefer `created_at` within `AUTO_GENERATION_MAX_AGE_HOURS` (7 days), live events always eligible by age.
2. Batch-resolve which listed signal IDs still exist.
3. Keep only events with `foundSignalCount > 0`.
4. Score / diversify with `selectEditorialCandidates`.
5. If a candidate still loads zero signals, classify via `classifyNoSignalsForEvent`:

| Class | Retryable | Typical reason |
|---|---|---|
| `retryable_dependency_gap` | yes | recent empty/dangling IDs |
| `obsolete_dangling_signals` | no | ≥72h non-live dangling IDs |
| `empty_signal_ids` | no when old | empty list, obsolete |
| `already_resolved` | n/a | signals present |

## Queue payload contract

`editorial_generate` jobs from the event bus carry:

```json
{
  "logId": "...",
  "sourceEventId": "<event_bus_messages.id>",
  "signalsInserted": 25
}
```

`sourceEventId` is a **bus message id**, not `news_events.id`. The worker runs a bounded batch against the resolvable event pool.

## Repair contract

`scripts/generation-yield-repair.ts`:

- dry-run default
- may annotate `clustering_metadata.generation_yield_quarantine` on obsolete dangling events
- must **not** invent signal relationships from title similarity
