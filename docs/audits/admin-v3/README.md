# Admin V3 audit

Production commit: `db0e905ba382b75d2ea9353b6412ee270ce14e6e`  
Deployment: `dpl_341NBnZ29zct22UU7ARCTJG2EDyv`

## Screenshot capture

```bash
# Public login geometry (local webServer or PLAYWRIGHT_BASE_URL)
npx playwright test e2e/admin-v3-geometry.spec.ts --project=chromium

# Authenticated routes require:
# E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
```

Screenshots write to `docs/audits/admin-v3/screenshots/`.

## Canonical health

- Client header + status popover: `GET /api/admin/system-status`
- Derivation: `src/lib/admin-v3/canonical-health.ts`
- Notifications reuse the same reason set via ops aggregation
