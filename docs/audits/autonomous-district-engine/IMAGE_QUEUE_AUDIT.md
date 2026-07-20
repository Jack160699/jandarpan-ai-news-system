# Image Queue Audit

## Table
`editorial_image_queue` (migrations 010 + 040)

## Baseline (kickoff)
| Status | Count |
|---|---:|
| completed | 493 |
| pending | 3 |
| failed | 0 (none in status rollup) |
| oldest pending | ~2026-07-19 19:50 UTC |

## Lifecycle
enqueue → claim → provider → quality → store → article update → complete

## Foundation additions
- Canonical resolver (`canonical-image-resolver.ts`)
- Public URL validation helpers (`image-url-validation.ts`)
- Image quality score model (`image-quality-score.ts`)

Reconciliation of stale pending jobs is Stage 1 bounded work — not executed in this PR.
