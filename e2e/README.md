# Admin auth E2E (Phase 5)

```bash
set ENABLE_E2E_AUTH=1
npm run dev
npm run test:e2e -- e2e/phase5-*.spec.ts e2e/admin-auth.spec.ts
```

Uses `POST /api/e2e/auth/set-session` + optional session mocks.  
`ENABLE_E2E_AUTH=1` required when `.env.local` has pulled `VERCEL=1`.  
Never enabled for `NODE_ENV=production` or `VERCEL_ENV=production`.

Production password QA needs `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (not committed).
