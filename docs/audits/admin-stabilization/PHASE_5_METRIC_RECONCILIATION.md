# Phase 5 Metric Reconciliation

| Metric | Sources | Contract |
|---|---|---|
| Platform state | `/api/admin/overview/daily` ↔ `/api/admin/ops/health-summary` | Must match when both present |
| Published today | overview editorial block | source / period / freshness via `trustTitle` |
| Costs / AI spend | overview (super_admin) | Editor response omits `costs` (not fake 0) |
| SEO / GSC | overview + SEO panels | Period labels may differ — do not force-equal |
| Executive CFO | `/api/admin/ops/executive` | `billing:read`; 403 without; 503 if provider fails |

Unit: `src/lib/admin-v3/phase5-metric-reconciliation.test.ts`  
E2E: `e2e/phase5-metrics.spec.ts`
