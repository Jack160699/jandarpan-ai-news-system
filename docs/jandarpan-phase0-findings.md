# Jandarpan — Phase 0 findings (2026-10-07)

Evidence: read-only SQL against production (`supabase db query --linked`, works under the 402) and code reading.
Window: signals/queue last 7 days unless stated. Nothing here was changed in production.

## 0. State of the platform right now
- Supabase REST/Edge: **HTTP 402 `exceed_egress_quota`** (probed 2026-10-07). Scheduler OFF since 2026-10-01 23:12 UTC. No end-to-end verification or go-live is possible until it clears.
- Last published article: 2026-10-01 20:07 UTC. Last ingested signal: 2026-10-01 22:40 UTC. The site is stale because the pipeline is paused, not because of a code fault.

## 1. Why the news was thin even while the pipeline was running
| Stage | Evidence | Finding |
|---|---|---|
| Output | `generated_articles` = 100 rows ever; per day 9,8,9,**30**,1,1,5,6 (Sep 23 – Oct 1) | The platform has never come near 100/day. Peak was 30. |
| Supply | 1,774 signals / 7d: **india 1,112, global 460, chhattisgarh 202 (11%)** ≈ 29 CG signals/day | 100 *Chhattisgarh* stories/day is not reachable from current sources. 100/day total is only reachable by counting India-relevant stories, which must never appear on district pages. |
| Providers | newsdata 939, rss 825, gnews 10 | `gnews:api` is `quota_exhausted`. NewsData carries the volume. |
| Sources | ~12 `rss:gnews-*` / `webdunia-cg` / `amarujala-cg` rows are `healthy` but last succeeded **2026-09-20** (old source keys); `webdunia-cg` has 134 consecutive empty runs; 5 sources `permanently_retired`, 3 `temporarily_disabled` | Health state is never derived from staleness, so dead sources look healthy. |
| Queue | 6,466 `rejected_stale` (all `source_older_than_48h`), 419 `rejected_geo`, 298 `quarantined`, 156 `pending` (oldest 2026-09-30), 23 `rejected_duplicate`, 205 `completed` | The stale backlog was correctly rejected, not blindly processed. Pending is small. |
| Candidates | `editorial_candidate_attempts`: 13 `quality_checks_failed`, 5 stale-evidence dead-letters, 2 duplicate-title quarantines | Quality gate + staleness are the main drops after clustering. |
| Events | 7,282 events, 2,693 superseded (duplicates), 4,589 active | Duplicate re-clustering fixed in PR #93. |

## 2. AI throughput ceiling (the real limit on stories/day)
From `ai_provider_usage_events` (7d):
- CodeCraft `deepseek-v4-pro-0813`: `editorial_generate` 40 calls, avg **24.6 s**, ~5.1k tokens; `editorial_repair` 28 calls, avg **16.8 s**, ~3.6k tokens. ≈ **8.7k tokens and ~42 s serial per story**; ~70% of stories need a repair pass.
- Gemini `3.5-flash-lite`: `editorial_generate` 6 calls avg **2.1 s** (~2.4k tokens), repair avg 1.5 s, translation 38 calls avg 1.8 s — all successful. Currently only a fallback.
- Chain is `codecraft → gemini → groq` (`src/lib/ai/providers/router.ts`). The slowest, most capped provider goes first.
- Configured caps: codecraft 6 rpm / 30k tpm / 300 rpd / **400k tpd** / 1 concurrent ⇒ ≈ 46 stories/day by tokens. gemini-3.5-flash-lite 14 rpm / 500 rpd / 2 concurrent / no tpd ⇒ ~150–250 stories/day by requests.
- Conclusion: 100/day is an AI-throughput problem as much as a supply problem. It needs a faster primary (flash-lite) for the volume path, with CodeCraft kept for high-value stories, plus a per-run time budget that is not consumed by one slow call.
- Other failures seen: `cloudflare flux-1-schnell editorial_image` 4/4 failed (`ai_http_error`); `gemini-3.6-flash` generate 3 upstream errors; one legacy `deepseek-v4-pro-max` unauthorized (old model id).

## 3. Already built (reuse, do not rebuild)
- Per-source health: `ingestion_source_state` has every field in the spec (health_state, last_new_item_at, consecutive_failures/empty_runs, quota/rate-limit until).
- Provider fallback chain + atomic quota governor (`src/lib/ai/providers/`), usage log `ai_provider_usage_events`.
- Queue leases/attempts/backoff/failure_class on `news_ai_queue`; candidate dead-lettering in `editorial_candidate_attempts`.
- Cross-language links (`story_language_links`, migrations 088/091), final-text duplicate check, roundup filter.
- Audio: `article_audio` already has article_id, language, style, voice_model, script, status, storage_path, duration_ms, latency_ms, provider_request_id, attempts, error.
- Engagement: `story_engagement_counts`, `reader_analytics_events`, `monetization_events`.

## 4. Not yet investigated (do not treat as findings)
Public feed glitches (Latest ordering, district leakage, language mismatch, generic headlines), site performance/query plans, RLS audit, admin dashboard data sources, user count source, image pipeline failures. These need code review of `src/lib/homepage`, feed views and `src/app/admin`, and EXPLAIN on the feed queries (EXPLAIN works under 402).

## 5. Proposed Stage 1 order (each its own PR)
1. Source health derived from staleness + retire/refresh dead source keys (small, safe).
2. Writer chain: Gemini flash-lite as volume path, CodeCraft for high-value stories, env-configurable, behind quality gates; per-run time budget.
3. Feed correctness: strict `published_at` Latest, geo-class column + district filter, language/script validation, generic-headline gate.
4. Feed query slimming + indexes from EXPLAIN.
5. Image decoupling check (publish before image) and image-provider fallback.
Go-live of any of these waits for the Supabase quota to clear.
