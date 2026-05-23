# Supabase setup — newspaper-motion

Production Supabase integration for Next.js 16 App Router on Vercel.

## Architecture

```
src/
  lib/supabase/
    client.ts       # Browser (anon key, @supabase/ssr)
    server.ts       # Anon + cookie session server clients
    admin.ts        # Service role (server only, singleton)
    middleware.ts   # Session refresh in Edge middleware
    auth.ts         # signIn / signOut / OAuth / OTP helpers
    queries.ts      # fetchLatestNews, fetchArticleBySlug, …
    env.ts          # Env validation
    types.ts        # Hand-maintained Database types
  types/supabase.ts # Public type re-exports
  utils/env.ts      # Server-only guards + env summary
  hooks/useSupabase.ts
```

## Environment variables

| Variable | Where | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes (cron, ingestion, dashboard) |

Copy `.env.example` to `.env.local` for local dev. Set the same keys in **Vercel → Project → Environment Variables** for Production and Preview.

**Never** prefix the service role key with `NEXT_PUBLIC_`.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in keys from Supabase Dashboard → API
npm run dev
```

Diagnostics: [http://localhost:3000/debug/supabase](http://localhost:3000/debug/supabase)

## Migrations

1. Link project (once): `npx supabase link --project-ref <ref>`
2. Apply migrations:

   ```bash
   npx supabase db push
   ```

   Or run SQL files in order in the Supabase SQL Editor (`001` … `021`).

3. Read `SUPABASE_MIGRATION_REVIEW.md` before production — **run 021** for SaaS RLS.

## Generate TypeScript types

```bash
npm run supabase:types
```

Merges into `src/lib/supabase/database.generated.ts` (optional; hand types in `types.ts` remain source of truth until merged).

## Auth workflow

1. Create user in Supabase Dashboard → Authentication (or enable Google / Email OTP).
2. Seed tenant membership:

   ```bash
   curl -X POST http://localhost:3000/api/dashboard/seed-membership \
     -H "Content-Type: application/json" \
     -d '{"userId":"<uuid>","email":"you@example.com","role":"owner"}'
   ```

3. Sign in at `/dashboard/login` (password) or wire Google via `signInWithGoogle()` in `lib/supabase/auth.ts`.

Sessions:

- Supabase SSR cookies (refreshed in `src/middleware.ts`)
- Legacy httpOnly `nr-dashboard-access` / `nr-dashboard-refresh` for dashboard API compatibility

Protected routes: `/dashboard/*` except `/dashboard/login` (middleware redirect).

Roles: `owner`, `admin`, `editor`, `viewer`, `billing` — see `src/lib/saas-auth/rbac.ts`.

## Data access

```ts
import {
  fetchLatestNews,
  fetchArticleBySlug,
  fetchTrendingNews,
  fetchRegionalNews,
  fetchNewsByCategory,
} from "@/lib/supabase";
```

Server writes / cron: `createAdminServerClient()` from `@/lib/supabase` (imports `admin.ts`).

Public reads: `createAnonServerClient()` or query helpers above.

## Deployment (Vercel)

- Runtime: Route handlers using admin client use `export const runtime = "nodejs"` where needed.
- Middleware: Edge-compatible (`@supabase/ssr` session refresh).
- Cron routes: require `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY`.
- After deploy: hit `/api/health` and `/debug/supabase` once to verify connectivity.

## Security rules

1. Service role only in Route Handlers, Server Actions, cron — never in `"use client"` files.
2. Use `assertServerOnly()` from `@/utils/env` in admin modules (already applied).
3. RLS is the primary defense; admin client bypasses RLS — treat it like a root DB password.
4. Remove or protect `/debug/supabase` before public launch (add auth or delete route).

## Debugging

| Symptom | Check |
|---------|--------|
| Empty homepage | RLS on `news_articles`, env vars on Vercel |
| 401 dashboard | Membership row + Auth user id match |
| `Missing SUPABASE_SERVICE_ROLE_KEY` | Vercel server env only |
| Anon read fails | Migration 005 + 001 policies |

API health: `GET /api/health`
