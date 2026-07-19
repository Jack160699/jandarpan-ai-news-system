# Phase 5 — Failure Handling

## Rules

1. **Do not publish** when validation fails (persist + publish gates).
2. Record **exact validation codes** on job/batch results (`validation_failed:code1,code2`).
3. **Retry** only when all issues are retryable and attempts &lt; 3.
4. **Quarantine** after threshold or non-retryable duplicates/unsafe markup (`quarantine:…;manual_review_required`).
5. Preserve **event/cluster linkage** (no row delete; skip persist).
6. Expose **manual review** via quarantine reason + metrics `manualReview`.
7. Raise **`GENERATION_QUALITY_INCIDENT`** only after repeated batch failures (≥3 fails, ≥2 quarantines, or pass rate &lt;40% on ≥5 attempts).

## Batch continuity

A single invalid candidate increments `rejected`, logs reasons, and **`continue`s** the loop. Rescue only considers non-hard-reject candidates (structural hard rejects stay excluded).

## Desk drafts

Admin create API no longer seeds `Untitled story`. Desk drafts are flagged `publication_blocked` / `desk_placeholder` and cannot pass the publish gate until authored content validates.
