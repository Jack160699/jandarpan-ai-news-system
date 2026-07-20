# Remaining Blockers — Step 2

## Cleared for Step 2 acceptance

Execution path works; backlog draining; coverage rising.

## Residual (non-blocking)

1. **Historical corpus gap** — audit `backlogAfter` still ~317 HI missing EN; will drain over subsequent `:10`/`:40` runs.
2. **Enqueue vs process rate** — each cron enqueues 20 while processing 12; consider lowering enqueue batch later so pending stays flatter (optional tuning, not a defect).
3. **EN→HI** — only 2 English published sources; low priority.
4. **Wire dead jobs** — 24 permanent `article_not_found`; leave dead.
5. **Historical duplicate job rows** — one dedupe_key with 2 completed rows from Jul 7/9 (pre-Step 2); no new duplicates this recovery.
6. **Manual cron invoke** — local/CLI cannot read production `CRON_SECRET` (empty pull); scheduled Vercel cron is the operational path.
