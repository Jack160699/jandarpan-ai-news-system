# CodeCraft Pro efficiency — baseline, changes, how to re-measure (2026-10-07)

Policy: CodeCraft Pro stays the PRIMARY editorial provider. Gemini Flash-Lite quota is preserved (not a volume engine).
No quality gate was weakened. Nothing here schedules or deploys anything; the scheduler stays OFF while Supabase returns 402.

## Baseline (production data, read-only)
Use `scripts/sql/codecraft-efficiency-report.sql` (direct-SQL path; works under 402).

**Do not read the 30-day numbers at face value.** Most failures in that window are the retired model id `deepseek-v4-pro-max`
(`ai_unauthorized` Sep 22-30; `ai_empty_response` at 96-150 s/call Sep 20-22). The valid baseline is the current model
`deepseek-v4-pro-0813`, which has only run on 2026-10-01 (before PRs #90-#92 landed):

| Metric (deepseek-v4-pro-0813, 2026-10-01) | Value |
|---|---|
| generate calls / success | 43 / 40 (93%) |
| generate avg latency | 24.6 s (~5.1k tokens) |
| repair calls / success | 29 / 28 (97%); avg 16.8 s (~3.6k tokens) |
| repair (depth-retry) calls per generate call | 67% |
| events that were paid for | 19 → **3 persisted an article, 16 persisted none** |
| of the 16 wasted events | 10 = one aggregator "live news page" (fixed in PR #92), 3 = the same police-transfer story (fixed in PR #91) |
| avg CodeCraft tokens / seconds per event | 10.6k / 51 s (usage rows with null `event_id` exist, so this is a lower bound) |
| published per day (all time, 100 articles) | 2.63 total; 1.33 CG; 0.57 district-specific; 0.67 statewide; 0.83 national/india-relevant; 0.23 international |
| approved articles with geo scope UNKNOWN/missing | 10 (policy: must never be district news; tracked for the feed-correctness stage) |
| remaining CodeCraft quota | not recorded by the provider (`quota_remaining` is null); the Redis counters are the source of truth and Redis was not read |

Why the repair rate was ~67-70%: the depth gate requires `depthRejectThreshold(type)` words (short_update 187), the first-pass prompt only
asked for "near ~N words", and median fact packs are ~900-1,000 chars (~150 Hindi words) — the hard floor appeared only in the paid retry
prompt. 23 of 56 rejection reasons were `body_too_short_for_type`; avg depth retries/article 0.23.

## Changes (all unit-tested; none touch a quality gate)
1. `src/lib/ai/prompts.ts` — first-pass prompt states the gate's own hard minimum (`depthRejectThreshold`), so the model aims at it before the paid retry.
2. `src/lib/news/ai/evidence-viability.ts` (+ hook in `generate-article.ts`, before the embedding duplicate check) — if the fact pack cannot support the
   type's floor, demote via the existing ladder (never into breaking_alert) or skip before any model call. Reason `evidence_below_floor:*` is
   non-countable (never dead-letters; a later signal can lift the pack). Default 3.0 fact-pack chars per floor word (smallest pack that ever published was ~800 chars);
   tune with `EDITORIAL_FACTPACK_CHARS_PER_FLOOR_WORD` (0 disables).
3. `src/lib/infrastructure/workers/editorial-priority.ts` — evidence-richness term inside the coverage tier (−400 below 700 chars … +600 at 2,500+ chars), fed from the slate's `evidence_chars`.
4. `src/lib/news/ai/queue.ts` — the RPC-failure fallback claimed oldest-first with no window; now freshest-first, 48 h window, honours retry backoff (same as `claim_ai_queue_batch`).
5. `scripts/source-health-audit.ts` — read-only classification of `ingestion_source_state` with the dashboard's own `deriveSourceHealth`.
6. `scripts/sql/codecraft-efficiency-report.sql` — repeatable before/after metrics.

## Data change applied to production (reversible)
13 enabled-but-orphaned `ingestion_source_state` rows (keys no longer in `RSS_SOURCES`, last success 2026-09-20, stored label "healthy") set to
`enabled=false, health_state='permanently_retired'` with the previous values in `metadata.retired_by_audit`. Nothing polled them. Undo: restore `enabled`/`health_state` from that key.
Left alone on purpose: 38 sources that read "degraded — no fetch for ~131 h" only because the scheduler is paused; PIB India/Hindi (publisher returns HTTP 403 to automated
fetchers — not worked around; already disabled); `gnews:api` (provider quota exhausted).

## Not measurable until the pipeline runs again
Post-change repair rate, tokens/article, rejection %, throughput. Re-run the report after the first scheduler cycles and compare with the table above.
Expected direction only (not a measured result): fewer depth-retry calls and fewer paid calls on hopeless candidates.
