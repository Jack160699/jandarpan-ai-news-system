# Phase 1 — Admin Permission Matrix

**Date:** 2026-07-19  
**Baseline SHA:** `60cd89d8e091e3fc0c70b63f454fd31c0acb2e7e`  
**Scope:** Admin APIs under `/api/admin`, `/api/editorial`, analytics/dashboard used by admin, cron only when admin-facing.

## Sensitivity categories

| Category | Meaning |
|---|---|
| Public | Unauthenticated OK |
| Editorial | Story / queue / media |
| Analytics | Audience + SEO signals |
| Financial | Billing, AI spend, budgets |
| Operational | Health, pipeline, queues, cron |
| Security-sensitive | Sessions, 2FA, audit |
| Schema/database-sensitive | Schema health / DB introspection |
| Super-admin only | Team, schema, org write |

## Canonical roles (product)

| Audit persona | Canonical role | Notes |
|---|---|---|
| Super admin | `super_admin` | Full permissions |
| Editor in chief / technical admin | `moderator` | Editorial + monitoring; **no billing** |
| Editor | `editor` | Editorial + analytics; **no monitoring/billing** |
| Reporter / viewer | `journalist` | Editorial + analytics + monitoring; **no billing** |
| Business admin | *(no distinct role)* | Today only `super_admin` has `billing:read` |

## Endpoint inventory (admin-facing)

| Route | Methods | Auth guard | Required permission | Data categories | Sensitivity | Workspace | Intended users | Verdict |
|---|---|---|---|---|---|---|---|---|
| `/api/admin/overview/daily` | GET | `requireAnyAdminPermission` | any of content/editorial/analytics/monitoring/billing; **sectioned** | Editorial, Analytics, Financial, Operational | Mixed | Command Centre | Owner + permitted roles | **Fixed** — was too broad (`analytics:read` alone) |
| `/api/admin/system-status` | GET | `requireAdminPermission` | `content:read`; monitoring soft-gated | Operational (limited without monitoring) | Operational | Shell | All admins | OK + contract |
| `/api/admin/ops/health-summary` | GET | `requireAdminPermission` | `monitoring:read` | Operational | Operational | Platform | Technical / owner | OK + contract |
| `/api/admin/ops/health` | GET | `requireEditorialAuth` | `monitoring:read` | Operational | Operational | Platform | Technical | OK |
| `/api/admin/ops/metrics` | GET | `requireEditorialAuth` | `monitoring:read` | Operational | Operational | Platform | Technical | OK |
| `/api/admin/ops/errors` | GET/POST | `requireEditorialAuth` | `monitoring:read` | Operational | Operational | Platform | Technical | OK |
| `/api/admin/ops/executive` | GET | `requireEditorialAuth` | **`billing:read`** | Financial | Financial | Business / CC | Super admin (billing) | **Fixed** — was `monitoring:read` |
| `/api/admin/ops/executive/export` | POST | `requireEditorialAuth` | **`billing:read`** | Financial | Financial | Business | Super admin | **Fixed** |
| `/api/admin/notifications` | GET | `requireDashboardSession` | `content:read` | Operational mixed | Operational | Shell | All admins | Broad (loads health) — Phase 2 |
| `/api/admin/billing` | GET | `requireDashboardSession` | `billing:read` | Financial | Financial | Business | Billing | OK |
| `/api/admin/team` | * | `requireSuperAdminSession` | super admin | Security / team | Super-admin only | Team | Super admin | OK |
| `/api/admin/schema/health` | GET/POST | `requireSuperAdminSession` | super admin | Schema | Schema/database-sensitive | Platform | Super admin | OK |
| `/api/admin/seo/*` (read) | GET | `requireEditorialAuth` | `analytics:read` | Analytics | Analytics | Business | Business / editors | OK |
| `/api/admin/seo/execution/apply\|reject` | POST | `requireEditorialAuth` | `editorial:write` | Analytics + write | Analytics | Business | Editors | OK |
| `/api/admin/ai-copilot/*` | GET/POST | `requireEditorialAuth` | `analytics:read` | Analytics | Analytics | Editorial | Editors+ | OK |
| `/api/admin/platform/articles` | GET | `requireEditorialAuth` | `content:read` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/admin/platform/articles/[id]` | PATCH | `requireEditorialAuth` | `editorial:write` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/admin/platform/sources` | GET | `requireEditorialAuth` | `providers:read` | Editorial | Editorial | Editorial | Editors+ | OK |
| `/api/admin/platform/sources/[id]` | PATCH | `requireEditorialAuth` | `editorial:write` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/admin/platform/districts` | GET/POST | `requireEditorialAuth` | read / write | Editorial | Editorial | Editorial | Editors | OK |
| `/api/admin/platform/topics` | GET | `requireEditorialAuth` | `content:read` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/admin/platform/topics/[slug]` | PATCH | `requireEditorialAuth` | `editorial:write` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/admin/platform/config` | GET/PATCH | `requireEditorialAuth` | `content:read` / `team:write` | Org config | Super-admin write | Settings | Super admin write | OK |
| `/api/admin/organization` | GET/PATCH | `requireEditorialAuth` | `content:read` / `team:write` | Org | Super-admin write | Settings | Super admin write | OK |
| `/api/admin/system` | GET | `requireEditorialAuth` | `monitoring:read` | Operational | Operational | Platform | Technical | OK |
| `/api/admin/system/validate` | POST | `requireEditorialAuth` | `monitoring:read` | Operational | Operational | Platform | Technical | OK |
| `/api/admin/newsroom/health` | GET | `requireEditorialAuth` | `monitoring:read` | Operational | Operational | Platform | Technical | OK |
| `/api/editorial/dashboard` | GET | `requireEditorialAuth` | `content:read` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/editorial/article*` | * | `requireEditorialAuth` | `editorial:write` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/editorial/workflow*` | * | `requireEditorialAuth` | `editorial:write` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/editorial/images` | * | `requireEditorialAuth` | `editorial:write` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/editorial/intelligence` | GET/POST | `requireEditorialAuth` | analytics / write | Analytics+Editorial | Mixed | Editorial | Editors | OK |
| `/api/editorial/editor-ai` + AI helpers | POST | `requireEditorialAuth` | `editorial:write` | Editorial | Editorial | Editorial | Editors | OK |
| `/api/analytics/dashboard` | GET | `requireDashboardSession` | `analytics:read` | Analytics | Analytics | Business | Business/editors | OK |
| `/api/analytics/enterprise` | GET | `requireDashboardSession` | `analytics:read` | Analytics | Analytics | Business | Business | OK |
| `/api/dashboard/snapshot` | GET | `requireDashboardSession` | `analytics:read` | Analytics | Analytics | Legacy | Business | Legacy |
| `/api/security/*` | * | session / super admin | varies | Security-sensitive | Security-sensitive | Account | Owner | OK |

## Overview/daily section contract

| Section | Permission | Omitted when denied |
|---|---|---|
| `editorial` | `content:read` \|\| `editorial:write` | Key omitted |
| `audience` | `analytics:read` | Key omitted |
| `seo` | `analytics:read` | Key omitted |
| `costs` | `billing:read` | Key omitted |
| `platform` | `monitoring:read` | Key omitted |
| `incidents` | `monitoring:read` | Key omitted |

Response includes `permissions.granted` / `permissions.withheld` (no sensitive null fields for withheld sections).

## Middleware / page RBAC

| Layer | Source of truth | Notes |
|---|---|---|
| Middleware | Supabase session presence only | **Does not** authorize from `nr-dashboard-role` cookie |
| Admin layout | `getDashboardSession()` membership role | Enforces `canAccessAdminRoute` |
| API routes | Session + permission helpers | Canonical: `requireAdminPermission` / `requireAnyAdminPermission` |
| Client `AdminPageGate` | UX only | Never sufficient alone |

## Remaining breadth issues (not all fixed in Phase 1)

- Notifications API: `content:read` + heavy health (Phase 2 performance).
- Journalist still has `monitoring:read` (product role matrix quirk).
- No distinct `business_admin` / `technical_admin` DB roles yet.
