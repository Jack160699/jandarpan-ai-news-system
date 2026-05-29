# Admin auth E2E

Run locally:

```bash
# Terminal 1 — enable E2E routes (non-production only)
set ENABLE_E2E_AUTH=1
npm run dev

# Terminal 2
npm run test:e2e
```

Playwright can also start the dev server with `ENABLE_E2E_AUTH=1` when port 3000 is free.

E2E uses `POST /api/e2e/auth/set-session` (header `x-e2e-auth: playwright-local`) plus optional session API mocks. Disabled when `VERCEL_ENV=production`.
