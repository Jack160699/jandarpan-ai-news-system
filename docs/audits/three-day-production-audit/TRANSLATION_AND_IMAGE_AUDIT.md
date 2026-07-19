# Translation & Image Pipeline Audit

Restored snapshot for Phase 4 recovery context (original three-day forensic audit, 17–19 Jul 2026 IST).

## Part A — Translation

### Coverage (generated_articles, all-time at audit)

| Native language | Rows | Have EN | Have HI | Have CG |
|---|---:|---:|---:|---:|
| hi | 870 | 58 | n/a | 0 |
| en | 2 | n/a | 0 | 0 |
| cg | 1 | 0 | 0 | n/a |

- **Translation coverage ≈ 6.6%** (58 of 873 articles carry any translation; all Hindi→English).
- **Chhattisgarhi:** 0 CG translations produced; `NEWSROOM_CG_TRANSLATION` unset (disabled).

### Worker throughput (3-day window)

| Direction | Outcome |
|---|---|
| Hindi→English (`translate_article`) | **0/26 ok** — all failed |
| Failure | `ReferenceError: urgencyScore is not defined` |
| Pending at audit | **51** `translate_article` |

### Root cause (Phase 4)

Adaptive translation body slicing expects an urgency score from `news_events.urgency_score`. The translate path never bound `urgencyScore` before calling adaptive helpers (naming/wiring drift after AI CFO adaptive-tokens change). Legacy payloads only carry `{ articleId, targetLanguage }`.

## Part B — Images (out of Phase 4 scope)

- Editorial images were overwhelmingly `region_curated` stock/fallback; no AI image generation flood in-window.
