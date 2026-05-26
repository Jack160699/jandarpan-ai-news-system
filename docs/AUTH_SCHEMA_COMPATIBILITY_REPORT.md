# Auth Schema Compatibility Report

> **Status:** Resolved by migration `024_newsroom_auth_normalize.sql` and app changes documented in [AUTH_NORMALIZATION_COMPLETE.md](./AUTH_NORMALIZATION_COMPLETE.md).

# Auth Schema Compatibility Report (pre-migration)

Generated before migration `024_newsroom_auth_normalize.sql`.

## Current state (migrations 017–023)

### `newsroom_tenants` (017)

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | OK |
| slug | text UNIQUE | OK |
| status | text | active/suspended/trial — **keep** |
| domains | text[] | **keep** (domain routing) |
| config | jsonb | **keep** (branding/theme) |
| created_at, updated_at | timestamptz | OK |
| **name** | — | **MISSING** (requested; backfilled from config) |

### `tenant_memberships` (018 + 023)

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | OK |
| tenant_id | uuid FK → newsroom_tenants | OK |
| user_id | uuid | **NO FK to auth.users** (018) |
| email | text | OK |
| role | text | Constraint drift: 018 vs 023 vs app types |
| status | text | active/invited/suspended — OK |
| invited_by, last_login_at | optional | OK |
| created_at, updated_at | timestamptz | OK |

### Role constraint history

| Migration | Allowed roles |
|-----------|----------------|
| 018 | owner, admin, editor, viewer, billing |
| 023 | + super_admin, publisher (if applied) |
| App (types.ts) | owner, super_admin, admin, publisher, editor, viewer, billing |
| **Target** | super_admin, editor, moderator, journalist |

### RLS (021)

| Table | anon | authenticated | service_role |
|-------|------|---------------|--------------|
| newsroom_tenants | SELECT active | SELECT active | ALL |
| tenant_memberships | — | — | ALL only |
| editorial_audit_log | — | — | ALL |

**Gap:** Authenticated users cannot read own membership via anon client — app uses **service role** in `getDashboardSession`, which is correct for server routes but blocks future client-side membership reads.

### Auth systems (dual layer)

1. **Supabase Auth** — `auth.users`, SSR cookies (`sb-*`)
2. **Legacy dashboard cookies** — `nr-dashboard-access`, `nr-dashboard-refresh`

Both are set on login (`/api/dashboard/auth/login`). Middleware accepts either Supabase user or legacy JWT cookie.

### Detected issues

1. **Role enum mismatch** — DB constraint, migration 023, and TypeScript types disagree.
2. **No `name` on tenants** — Display name only in `config` JSON.
3. **No FK user_id → auth.users** — Orphan memberships possible.
4. **Membership required for admin** — `getDashboardSession` returns null without row → redirect loop.
5. **Tenant slug filter** — Fixed in app: fallback to first membership if tenant cookie mismatches.
6. **023 may not be applied** — Production may still run 018 role check only.

## Normalization plan (024)

- Add `newsroom_tenants.name`, backfill from `config.branding.nameEn`
- Map legacy roles → `super_admin | editor | moderator | journalist`
- Tighten `tenant_memberships_role_check` to four canonical roles
- Add FK `user_id` → `auth.users` (NOT VALID, validate when clean)
- RLS: authenticated users may **SELECT** own membership rows
- Seed / upsert Jan Darpan tenant by slug
- App bootstrap on login ensures membership for signed-in users

## Non-destructive guarantees

- Does not drop `config`, `domains`, `status` on tenants
- Does not delete articles, signals, events, or auth users
- Role migration is UPDATE only
- Orphan memberships without auth.users are reported, not deleted by default
