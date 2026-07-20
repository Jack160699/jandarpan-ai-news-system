# Baseline Funnel

Measured against live production at commit `8c1367a` (deployment `dpl_3AFZhFTbafJ36oKCgnN9YqKMv8t3` @ `main`).

## 7-day funnel

| Metric | Value |
|--------|------:|
| signals_7d | 8264 |
| gen_completed_7d | 116 |
| published_7d | 40 |
| published_with_hero_7d | 40 |
| published_no_hero | 0 |

## Image queue

| Metric | Value |
|--------|------:|
| completed | 493 |
| pending | 3 |
| oldest pending | ~2026-07-19 |

## Editorial gaps

- Geo district unknown for **all 40** published articles in the window.
- Largest gap: district tagging + capacity ceiling **40/day**.
- Step 5 **ABORTED BY PRODUCT DECISION** at `2026-07-20T20:32:25Z`.

## Rollback reference

- Backup branch retained with deployment `dpl_3AFZhFTbafJ36oKCgnN9YqKMv8t3`.
