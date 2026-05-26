# Jan Darpan OS — Enterprise Security Audit Report

**Date:** 2026-05-26  
**Scope:** Supabase RLS (32→33 migrations), Next.js middleware, RBAC, API routes, realtime, DAM, analytics, workflow  
**Auditor:** Automated hardening pass + manual policy review

---

## Executive Summary

Jan Darpan OS had a solid **application-layer RBAC** foundation (`AdminPageGate`, `requireDashboardSession`, cron auth) but **database-layer tenant isolation was weak** for multi-tenant SaaS. This release hardens RLS, adds enterprise auth controls (2FA, session revocation, audit trails), and closes the highest-risk public-read gaps.

**Post-hardening enterprise readiness score: 78/100** (see `ENTERPRISE_READINESS.md`)

---

## Findings Addressed (Critical → Low)

### Critical — Fixed

| ID | Finding | Remediation |
|----|---------|-------------|
| C-01 | Monetization tables (`monetization_placements`, `reader_plans`, etc.) allowed **cross-tenant anon SELECT** | Dropped public read policies; app uses service role with `tenant_id` filter (`021` → `033`) |
| C-02 | `generated_articles` public read exposed **draft/unpublished** rows | RLS: `published_at IS NOT NULL` + approved statuses; app query filtered |
| C-03 | `match_intelligence_embeddings` callable by **anon** | `REVOKE EXECUTE FROM anon` (`033`) |

### High — Fixed / Mitigated

| ID | Finding | Remediation |
|----|---------|-------------|
| H-01 | No session revocation | `security_sessions` + `revokeSession` on logout |
| H-02 | No brute-force / rate limits on login | `checkLoginRateLimit`, account lockout, Upstash fallback |
| H-03 | Middleware auth-only (no RBAC) | Role cookie + `checkPathRbac` in middleware |
| H-04 | Dashboard routes not permission-gated server-side | `DashboardGate` uses `canAccessDashboardRoute` |
| H-05 | Predictable realtime channel names | Tenant-scoped `collab:{tenantId}:{type}:{id}` |
| H-06 | Recursive RLS on `tenant_memberships` | `security_definer` helpers `security_user_tenant_ids()`, `security_is_super_admin()` |

### Medium — Partially Addressed

| ID | Finding | Status |
|----|---------|--------|
| M-01 | No 2FA | TOTP via `/api/security/2fa/*`; optional `SECURITY_REQUIRE_2FA=1` for super_admin |
| M-02 | Minimal security headers | CSP, HSTS, Permissions-Policy in `security/headers.ts` + middleware |
| M-03 | No security audit trail | `security_audit_events`, `security_login_events`, `security_permission_changes` |
| M-04 | Service-role-only tables rely on app isolation | Documented; RLS remains service_role — **defense in depth = API guards** |
| M-05 | `newsroom_tenants` public read exposes all active tenants | Retained for domain routing; limit columns in future view |

### Low — Backlog

| ID | Finding | Recommendation |
|----|---------|----------------|
| L-01 | Supabase Realtime private channel JWT auth | Enable Supabase Realtime authorization when on Pro |
| L-02 | SSO/SAML | Add when enterprise contracts require |
| L-03 | Column-level grants on `newsroom_tenants` | Create `newsroom_tenants_public` view |
| L-04 | WAF / bot management | Cloudflare or Vercel Firewall in front |

---

## Control Matrix (Implemented)

| Control | Implementation |
|---------|----------------|
| Authentication | Supabase Auth + httpOnly cookies |
| Authorization | RBAC matrix (`saas-auth/rbac.ts`) + middleware + page gates |
| Tenant isolation (DB) | RLS helpers + monetization lockdown + published-only articles |
| Session management | `security_sessions`, inactivity timeout (4h), revocation |
| Audit logging | `security_audit_events`, editorial audit (existing) |
| 2FA | TOTP + backup codes (`user_two_factor`) |
| Rate limiting | Login + super-admin actions (Redis/in-memory) |
| Security headers | CSP, HSTS, X-Frame-Options, nosniff |
| Env validation | `instrumentation.ts` + `SECURITY_ENV_STRICT=1` |
| Secret scanning | `secrets-scan.ts` redaction helpers |

---

## Deployment Checklist

1. Run migration `033_enterprise_security.sql` on Supabase
2. Set production env vars:
   - `SECURITY_2FA_ENCRYPTION_KEY` (32+ byte random)
   - `NEWSROOM_SUPER_ADMIN_EMAILS`
   - `CRON_SECRET`
   - `UPSTASH_REDIS_REST_URL` / `TOKEN` (rate limits)
   - Optional: `SECURITY_REQUIRE_2FA=1`, `SECURITY_ENV_STRICT=1`
3. Regenerate Supabase types: `npm run supabase:types`
4. Verify public site still loads published articles
5. Enroll super_admin 2FA before enabling `SECURITY_REQUIRE_2FA`

---

## Files Changed (Security Surface)

- `supabase/migrations/033_enterprise_security.sql`
- `src/lib/security/*`
- `src/middleware.ts`
- `src/app/api/dashboard/auth/login|logout/route.ts`
- `src/app/api/security/**`
- `src/components/dashboard/DashboardGate.tsx`
- `next.config.ts`, `src/instrumentation.ts`
