# Phase 4 — Translation Root Cause

## Symptom

`translate_article` failed 100% in the three-day window with:

```text
ReferenceError: urgencyScore is not defined
```

Coverage ≈ **6.6%**. Valid Hindi↔English work remained pending.

## Intended contract

| Concern | Source |
|---|---|
| Urgency for body tier / token budget | `news_events.urgency_score` via `generated_articles.event_id` |
| Fallback when event missing | **50** (same as editorial `classifyEditorialTier` / image-context) |
| Job payload (legacy) | `{ articleId, targetLanguage }` only — urgency was never a required payload field |
| Job payload (Phase 4) | Standardized contract including `sourceLanguage`, `sourceContentVersion`, optional `urgencyScore` cache |

Translation **does** depend on urgency for adaptive body slicing / max tokens (breaking vs regular tiers). It must not invent urgency `0` (that would force short/non-breaking tiers incorrectly).

## Root cause

1. Adaptive helpers in `adaptive-tokens.ts` accept optional `urgencyScore`.
2. Editorial generation correctly passes `event.urgency_score`.
3. Translation called `adaptiveTranslationBodySlice(article_body)` without resolving urgency from the event, and production runs failed when a bare `urgencyScore` identifier was evaluated in the translate path (wiring / naming drift after the Jul 6 adaptive-tokens change).
4. Pre-LLM adaptive work sits outside the OpenAI `try/catch`, so the ReferenceError surfaced as `last_error` on the job.

## Fix (Phase 4)

1. `resolveTranslationUrgencyScore({ payload, event, editorial_metadata })` with default **50**.
2. Handler loads `event_id` → `news_events.urgency_score` and always binds a local `urgencyScore` before adaptive helpers.
3. Legacy payloads without urgency still work.
4. `source_content_version` stamped on completed bundles; same article/version/language is not re-translated.

## Non-fix

- Do not blind-requeue until this code is deployed.
- Do not treat disabled CG historical jobs as active Hindi/English backlog.
