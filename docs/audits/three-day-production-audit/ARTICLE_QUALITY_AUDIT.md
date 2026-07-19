# Daily Publication Quality Audit

Restored snapshot for Phase 5 (original three-day forensic audit, 17–19 Jul 2026 IST).

Only **10 articles** were generated/published in the three-day window. All are enumerated in `data/articles_last_3_days.csv`.

## Headline quality finding

- **“Untitled story”** with empty body appeared **16 times all-time** (broken `editorial_generate` / desk seed output).
- At least one empty untitled draft appeared in-window (`0c94912c-…`, pending/draft).

## Per-day publication (window)

| Day | Published | Language | Notes |
|---|---:|---|---|
| Jul 17 | 4 | Hindi | region_curated images |
| Jul 18 | 2 | Hindi | |
| Jul 19 | 3 | Hindi | + 1 broken untitled draft |

## Phase 5 implication

Generation must hard-reject placeholder titles and empty/too-short bodies before persist/publish; batch must continue after a single invalid candidate; duplicates by cluster/title/body must not republish.
