# Jandarpan Auth Audit — Admin Login & Password Recovery

**Date:** July 2026  
**Scope:** Final implemented admin authentication UX and APIs after the command-centre overhaul  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  
**IdP:** Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`)  
**Canonical domain:** https://www.jandarpan.news  

---

## 1. Verdict

Admin authentication is a **single console flow** at `/admin/login`, with **forgot / reset password** routes and matching APIs under `/api/dashboard/auth/`. Session cookies and role-aware landings are wired.  

**Email delivery for reset links depends on Supabase Auth email configuration in the hosted project** — that is an external ops dependency and was not verified live in this session (see `JANDARPAN_REMAINING_BLOCKERS.md`).

---

## 2. Public auth routes (UI)

| Route | File | Purpose |
|-------|------|---------|
| `/admin/login` | `src/app/admin/login/*` | Email/password sign-in (`AdminLoginForm`) |
| `/admin/forgot-password` | `src/app/admin/forgot-password/page.tsx` | Request reset email |
| `/admin/reset-password` | `src/app/admin/reset-password/page.tsx` | Set new password after recovery link |

These paths are allowlisted as public in:

- `src/middleware.ts`
- `src/lib/security/middleware-rbac.ts`
- `src/lib/auth/middleware-session-guard.ts`
- `src/app/admin/layout.tsx` (`isPublicAuthRoute`)

Legacy login: `/dashboard/login` → **308** → `/admin/login`.

---

## 3. Auth APIs (`/api/dashboard/auth/`)

| Method | Path | Role |
|--------|------|------|
| `POST` | `/api/dashboard/auth/login` | Establish session cookies; return membership/role for landing |
| `POST` | `/api/dashboard/auth/logout` | Clear session; client navigates to login |
| `GET` / related | `/api/dashboard/auth/session` | Session helper (layout/middleware prefer server session resolution) |
| `POST` | `/api/dashboard/auth/refresh-session` | Session refresh |
| `POST` | `/api/dashboard/auth/forgot-password` | Trigger Supabase `resetPasswordForEmail` |
| `POST` | `/api/dashboard/auth/reset-password` | `updateUser({ password })` for recovery session |

API path prefix **`/api/dashboard/auth`** is intentional compatibility (unchanged since platform unification) even though the UI console is `/admin`.

---

## 4. Login redesign (implemented behaviour)

`AdminLoginForm` characteristics:

- Brand-forward header: logo + **Jandarpan.news** + subtitle **Admin Command Centre**
- Compact ambient background (orbs/grid/vignette) with elevated card
- Email + password, show/hide password toggle
- “Remember email” via `localStorage` key `jd-admin-login-email`
- **Forgot password?** → `/admin/forgot-password`
- Friendly error mapping (`forbidden`, `no_membership`, `rate_limited`, `account_locked`, etc.)
- On success: `resolveAdminLanding(role, nextParam)` then `window.location.assign`

Role landings:

| Role | Destination |
|------|-------------|
| `super_admin` | `/admin/overview` |
| `moderator` | `/admin/editorial` |
| `editor` | `/admin/stories` |
| `journalist` | `/admin/editorial` |

`next` must be a safe `/admin…` path (blocks protocol-relative / absolute URLs and `/admin/login`).

---

## 5. Forgot password flow

**UI:** Collect email → `POST /api/dashboard/auth/forgot-password` → generic success copy (inbox + spam guidance).

**API behaviour (`forgot-password/route.ts`):**

1. Validate JSON + email present.
2. Rate-limit via `checkLoginRateLimit(email, ip)`.
3. If Supabase not configured → `503 auth_unavailable`.
4. Build `redirectTo = {canonicalSiteUrl}/admin/reset-password`.
5. Call `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
6. Swallow errors; always return generic success message to avoid enumeration.

---

## 6. Reset password flow

**UI phases:** `loading` → `ready` | `invalid` | `success`.

On load, the client:

1. Creates a browser Supabase client from public env.
2. If URL hash contains recovery tokens (`access_token` / `type=recovery`), calls `setSession`.
3. Confirms `getUser()`; otherwise shows invalid/expired state.
4. On submit (password ≥ 8, matches confirm) → `POST /api/dashboard/auth/reset-password`.

**API behaviour (`reset-password/route.ts`):**

1. Reject passwords shorter than 8 characters.
2. Require authenticated user (`getUser`); else `401 invalid_or_expired_token`.
3. `updateUser({ password })`; map “same password” style errors to `password_unchanged`.
4. Apply/set access + refresh cookies on success.

Operators must ensure Supabase Auth **redirect URL allowlist** includes:

`https://www.jandarpan.news/admin/reset-password`

(and preview URLs only if intentionally used).

---

## 7. Roles & membership (unchanged canon)

Canonical roles (`src/lib/saas-auth/roles.ts`):

- `super_admin`
- `editor`
- `moderator`
- `journalist`

Legacy aliases (`owner`, `admin`, `publisher`, `viewer`, `billing`, …) normalize into the above. Production super-admin allowlist may use `NEWSROOM_SUPER_ADMIN_EMAILS` when set.

RBAC for routes: `src/lib/newsroom-auth/rbac.ts` + permission matrix in `src/lib/saas-auth/rbac.ts`.

---

## 8. Security notes (factual)

| Control | Status |
|---------|--------|
| Account enumeration on forgot | Mitigated (generic response) |
| Brute-force / rate limit on forgot | Reuses login rate limiter |
| Open redirect on login `next` | Mitigated (`isSafeAdminNext`) |
| Admin pages indexed | Mitigated (`NOINDEX_ROBOTS` + robots disallow) |
| Min password length on reset | 8 characters |
| Production credentials / secrets | **Not inspected or documented here** |

---

## 9. Related documents

- `JANDARPAN_ADMIN_REDESIGN.md`
- `JANDARPAN_STABILITY_AUDIT.md`
- `JANDARPAN_REMAINING_BLOCKERS.md`
- `docs/AUTH_NORMALIZATION_COMPLETE.md`
- `docs/ADMIN_PLATFORM_UNIFICATION.md`
