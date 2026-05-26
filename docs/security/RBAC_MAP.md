# RBAC Map — Jan Darpan OS

## Canonical Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full tenant control, team management, billing |
| `moderator` | Publish + editorial + analytics |
| `editor` | Write content, editorial desk |
| `journalist` | Read desk + limited write |

Legacy DB roles (`owner`, `admin`, `publisher`, `viewer`, `billing`) map via `normalizeDashboardRole()`.

---

## Permission Matrix

| Permission | super_admin | moderator | editor | journalist |
|------------|:-----------:|:---------:|:------:|:----------:|
| `analytics:read` | ✅ | ✅ | ✅ | ✅ |
| `content:read` | ✅ | ✅ | ✅ | ✅ |
| `content:write` | ✅ | ✅ | ✅ | ✅ |
| `editorial:write` | ✅ | ✅ | ✅ | ✅ |
| `publish:write` | ✅ | ✅ | ❌ | ❌ |
| `team:read` | ✅ | ❌ | ❌ | ❌ |
| `team:write` | ✅ | ❌ | ❌ | ❌ |
| `billing:read` | ✅ | ❌ | ❌ | ❌ |
| `billing:write` | ✅ | ❌ | ❌ | ❌ |
| `monitoring:read` | ✅ | ✅ | ❌ | ✅ |
| `providers:read` | ✅ | ✅ | ✅ | ❌ |

Source: `src/lib/saas-auth/rbac.ts`

---

## Admin Routes (`/admin/*`)

| Route | Permission | Extra |
|-------|------------|-------|
| `/admin/team` | `team:read` | **super_admin only** |
| `/admin/intelligence` | `analytics:read` | |
| `/admin/analytics` | `analytics:read` | |
| `/admin/editorial`, `/admin/articles` | `content:read` | |
| `/admin/stories`, `/admin/editor/*` | `editorial:write` | |
| `/admin/workflow`, `/admin/collaboration`, `/admin/media` | `editorial:write` | |
| `/admin/ingestion` | `monitoring:read` | |
| `/admin/sources` | `providers:read` | |

Enforced by: `AdminPageGate` + **middleware** `checkPathRbac` (role cookie)

---

## Dashboard Routes (`/dashboard/*`)

| Route | Permission |
|-------|------------|
| `/dashboard` | `analytics:read` |
| `/dashboard/content` | `content:read` |
| `/dashboard/publish` | `publish:write` |
| `/dashboard/editorial` | `editorial:write` |
| `/dashboard/team` | `team:read` |
| `/dashboard/billing` | `billing:read` |
| `/dashboard/analytics` | `analytics:read` |
| `/dashboard/monitoring` | `monitoring:read` |
| `/dashboard/providers` | `providers:read` |

Enforced by: `DashboardGate` + middleware RBAC

---

## API Route Guards

| Area | Guard | Permission |
|------|-------|------------|
| Editorial `api/editorial/*` | `requireEditorialAuth` | Per action |
| DAM `api/dam/*` | `requireDashboardSession` | `editorial:write` |
| Analytics desk | `requireDashboardSession` | `analytics:read` |
| Collaboration | `requireDashboardSession` | `editorial:write` |
| Admin team | `requireSuperAdminSession` | `team:read` + super_admin |
| Cron/workers | `verifyCronRequest` | `CRON_SECRET` |
| Security audit | `requireSuperAdminSession` | super_admin |

---

## Super Admin Protections

- Email allowlist: `NEWSROOM_SUPER_ADMIN_EMAILS`
- Rate limit: 30 actions/min (`guardSuperAdminAction`)
- All team PATCH/DELETE logged to `security_permission_changes`
- Optional mandatory 2FA: `SECURITY_REQUIRE_2FA=1`
- Cannot demote/suspend last super_admin (app logic)

---

## Realtime

| Channel pattern | Access |
|-----------------|--------|
| `collab:{tenantId}:{article\|tenant}:{roomId}` | Authenticated desk users (browser anon key + broadcast) |

Persistence always via guarded HTTP APIs. Future: Supabase Realtime private channels.
