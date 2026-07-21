# Jan Darpan — Production deployment report

**Status:** Pending merge decision documentation (filled after Production steps)

## Safety anchors

| Item | Value |
|------|-------|
| Feature branch | `feat/jandarpan-reader-design-system` |
| Rollback branch | `rollback/pre-reader-ds-production-20260721-1121` |
| Rollback / prior main SHA | `0dc5670b5d99e83c3715f29785615747d6b319be` |
| Pre-completion feature SHA | `405798a66e472c9782f39037b8552c5cf9233ca0` |

## Completion-pass changes (launch readiness)

- Rates Option C SEO/nav gating (`public-gate`, sitemap, noindex empty details)
- `/api/cg-rates` retired (503)
- Checkout CTA honesty
- Verified-rates cron skip without credentials
- Search filter drawer React duplicate-node fix
- A11y error retry label alignment

## Feature flags (Production)

| Flag | Required at go-live |
|------|---------------------|
| `NEXT_PUBLIC_READER_DS` | **unset / `0`** until staged enablement after smoke |
| `VERIFIED_RATES_*` provider enables | unset until credentials + stability gate |
| `NEWSROOM_AUTO_PUBLISH` | leave as currently configured |

## Post-merge fill-in

- Completion commit SHA:
- Final Preview deployment ID / URL:
- Merge SHA:
- Production deployment ID / URL:
- Production SHA verification:
- Smoke results:

See also: `docs/jandarpan-production-launch-readiness.md`, `docs/jandarpan-rollback-runbook.md`.
