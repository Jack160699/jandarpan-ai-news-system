# Production Recovery — Backlog Drain (Phase 9)

## Credential note

Local `.env.local` / Vercel CLI `env pull` expose **empty** Sensitive production secrets in this operator environment. Phase 3/4 CLI scripts therefore could not run against production keys. Controlled drain used the same safety rules via Supabase SQL (dry-run classification first, then bounded execute) plus live dedicated worker observation.

---

## Generation backlog (Phase 3 process)

### Before (pre-deploy baseline)

| Metric | Value |
|---|---|
| Pending `editorial_generate` | **30** |
| Claimed | 0 |
| Oldest pending | `2026-07-19 03:45:34 UTC` (~14.6h at baseline) |
| Max attempts on pending | 0 |
| Last errors | none on pending rows |

### Classification (post-deploy)

- All 30 pending rows were wake-ups with `attempts=0`, no `last_error`.
- Fresh dependency queues still heavy: `embed_signals` 44, `event_cluster` 37, `intelligence_*` backlog.
- Immediate retry via dedicated worker was the correct path (jobs already pending).
- Stale breaking auto-publish: **not** enabled for these skips.

### Execute / observation

Dedicated cron `/api/cron/editorial-generate` on production:

| Run (UTC) | HTTP | Heartbeat | Jobs claimed/completed |
|---|---|---|---|
| 18:35 | 200 | ok=true, degraded=true | 3 completed |
| 18:50 | 200 | ok=true, degraded=true | 3 completed |

Generation quality: `skipped=6` per batch with reason `no_signals_for_event`; `published=0`; quality passRate 100 on attempted validations (none attempted after skip).

### After

| Metric | Value |
|---|---|
| Pending | **24** (30 → 24) |
| Completed since deploy window | **6** |
| Oldest pending | `2026-07-19 06:46:07 UTC` |
| Failed in drain window | 0 |
| Quarantined generation jobs | 0 |
| Duplicates prevented | N/A (no publish attempts; skip path) |
| New articles generated post-deploy | **0** (signal dependency) |
| Publication flood | **none** |

### Throughput assessment

- **Immediate verification:** dedicated worker executes, claims atomically, heartbeats fresh, queue age/depth decrease.
- **Early trend:** ~3 jobs / 15-minute slot while skip-only.
- **Measurement still pending:** sustained article generation rate / long-term throughput target — **not proven** from skip-only runs.

---

## Translation backlog (Phase 4 process)

### Before

| Metric | Value |
|---|---|
| Pending `translate_article` | **51** |
| Completed historically | 6 |
| Oldest pending | `2026-07-17 05:44 UTC` |
| CG jobs in pending | **6** |
| HI/EN jobs | **45** |

### Dry-run classification (SQL)

| Class | Count |
|---|---|
| Pending total | 51 |
| Disabled language (cg) | 6 |
| HI/EN | 45 |
| Missing article | 24 |
| Potentially eligible (published + approved + hi/en) | **21** |
| Eligible clean (no last_error) | 21 |

### Execute (bounded)

| Action | Count |
|---|---|
| CG quarantined (`[quarantined] disabled_language:cg`) | **6** |
| HI/EN prioritized / recovery-touched (batch 5) | **5** |
| Completed post-deploy (to report time) | **0** |
| Failures in execute SQL | 0 |

### After

| Metric | Value |
|---|---|
| Pending | **45** |
| Quarantined (failed+annotated, not deleted) | **6** |
| Coverage (approx, published corpus) | HI published 869; EN translation field present 536 (~61.7% hi→en field coverage). EN published 2. |
| Coverage delta from this batch | **pending** (no completions yet in window) |

### Stop conditions

- Batch size capped at 5 for first execute.
- No flood enqueue.
- CG excluded permanently until `NEWSROOM_CG_TRANSLATION=true`.
- Further batches only after translation worker completes the prioritized 5.
