# Phase 3 — Backlog Classification

## Purpose

Evidence-based classification of pending / failed / claimed / dead worker jobs and DLQ rows **before** any production retry.

Age alone is never sufficient.

## Classes

| Class | Meaning | Default action |
|---|---|---|
| `eligible_immediate_retry` | Fresh uncovered events exist; job is a safe wake-up | `retry` |
| `eligible_after_dependency_recovery` | Upstream backlog (cluster/embed) blocks usefulness | `none` |
| `already_completed` | No uncovered events, or article already exists for payload event | `quarantine` |
| `duplicate` | Active sibling with same `(job_type, dedupe_key)` | `quarantine` |
| `stale_claim` | `claimed` past lease (`120s`) | `release_stale_claim` |
| `obsolete` | Too old and no fresh work / already quarantined | `quarantine` |
| `malformed` | Payload not an object | `quarantine` |
| `missing_source_record` | Payload `eventId` points at missing `news_events` | `quarantine` |
| `missing_tenant` | `tenant_id` set but tenant row missing | `mark_manual_review` |
| `manual_review_required` | Only stale uncovered events (no auto-publish) | `mark_manual_review` |
| `dead_letter_candidate` | `status=dead` | `annotate_dlq` |

## Evidence checks

For each candidate the classifier / runner verifies:

1. Tenant row exists (when `tenant_id` present)
2. Active duplicate jobs
3. Uncovered `news_events` vs `generated_articles.event_id`
4. Fresh vs stale uncovered split (`autoPublishMaxAgeHours=36`)
5. Payload `eventId` → event exists / already generated
6. Optional `sourceEventId` bus message presence (soft signal for wake-ups)
7. Claim lease age
8. Quarantine markers on `result` / `last_error`

## Editorial wake-up semantics

`editorial_generate` jobs from the event bus are **batch wake-ups**, not per-event jobs. Typical payload:

```json
{ "signalsInserted": N, "logId": "...", "sourceEventId": "<event_bus_messages.id>" }
```

“Already completed” for these means: **no uncovered news events remain** for the tenant scope — not “payload eventId missing”.

## DLQ resolutions

| Resolution | Examples |
|---|---|
| `fixed_by_new_architecture` | `editorial_generate` + `job_timeout` (dedicated lane) |
| `retryable` | `intelligence_snapshot` + `job_timeout` |
| `requires_code_repair` | `urgencyScore is not defined` |
| `obsolete` | Active sibling already pending/claimed |
| `requires_manual_review` | Permanent payload/tenant errors, unknown |

DLQ rows are **annotated** via `metadata.phase3` — never deleted by Phase 3 tooling.

## Rate limits

See `RECOVERY_RATE_LIMITS` in `src/lib/ops/editorial-backlog-types.ts`:

- max 5 job mutations / batch
- max 3 generation wake-ups / batch
- max 3 articles per wake-up payload `limit`
- 60s cooldown between execute batches
- stop after 2 consecutive action errors
