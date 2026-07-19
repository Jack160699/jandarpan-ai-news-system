# Admin E2E Final

## Local authenticated suite

```
ENABLE_E2E_AUTH=1
PLAYWRIGHT_SKIP_WEBSERVER=1
npx playwright test e2e/phase5-*.spec.ts e2e/admin-auth.spec.ts e2e/phase6-final-screenshots.spec.ts --workers=1
```

- Phase 5: 26/26 passed (role matrix, workflows, metrics, failures, responsive, auth)
- Phase 6 screenshots: `docs/audits/admin-stabilization/final-screenshots/`

## Auth

- Cookie desk auth via `/api/e2e/auth/set-session`
- Production password E2E: **blocked** without `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`

## Production verification

Requires live credentials; document results in final report after deploy.
