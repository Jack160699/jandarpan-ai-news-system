# Recovery Dry Run — Pre-deploy classification

Classification of active `translate_article` inventory (read-only), 2026-07-20:

| Class | Count | Action |
|---|---:|---|
| eligible_now (HI→EN pending, article present, published/approved) | 28 | Process via dedicated cron / bounded recovery |
| disabled_cg (quarantined) | 6 | Exclude |
| missing_article (wire-* dead) | 24 | Exclude; leave dead |
| already_completed | 0 among pending | — |
| duplicate_active | 0 | — |
| stale_claim | 0 | — |
| en_hi_pending | 0 | — |

**Eligible for first post-deploy batch:** 28 (start with ≤12 oldest-first).

**Do not requeue:** CG, wire dead, completed.

Execute path deferred until new release is READY (see `RECOVERY_EXECUTION.md`).
