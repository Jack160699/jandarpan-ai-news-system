import type { NextRequest } from "next/server";
import { logAdminSession } from "@/lib/auth/admin-session-log";
import {
  buildRefreshSessionUrl,
  isAuthApiExemptPath,
  isRefreshSessionPath,
  MAX_SESSION_REFRESH_ATTEMPTS,
  parseRefreshAttempt,
  SESSION_REFRESH_ATTEMPT_PARAM,
} from "@/lib/auth/session-refresh";
import { ROLE_COOKIE, TENANT_COOKIE_AUTH } from "@/lib/security/constants";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";

const ADMIN_PUBLIC = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
];
const DASHBOARD_PUBLIC = ["/dashboard/login"];

function isPublicAdminPath(pathname: string): boolean {
  return ADMIN_PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isPublicDashboardPath(pathname: string): boolean {
  return DASHBOARD_PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export type SessionGuardInput = {
  request: NextRequest;
  pathname: string;
  hasAuth: boolean;
  userId?: string;
  roleCookie?: string;
  tenantCookie?: string;
};

export type SessionGuardResult =
  | { action: "continue" }
  | { action: "refresh"; redirectTo: string; reason: string }
  | { action: "login"; redirectTo: string; reason: string };

/**
 * Requires role + tenant context cookies when authenticated on protected desk routes.
 */
export function evaluateSessionGuard(input: SessionGuardInput): SessionGuardResult {
  const { request, pathname, hasAuth, userId, roleCookie, tenantCookie } = input;

  if (!hasAuth) return { action: "continue" };
  if (isAuthApiExemptPath(pathname) || isRefreshSessionPath(pathname)) {
    return { action: "continue" };
  }

  const isAdminProtected =
    pathname.startsWith("/admin") && !isPublicAdminPath(pathname);
  const isDashboardProtected =
    pathname.startsWith("/dashboard") && !isPublicDashboardPath(pathname);

  if (!isAdminProtected && !isDashboardProtected) {
    return { action: "continue" };
  }

  const role = roleCookie?.trim() ? normalizeDashboardRole(roleCookie) : null;
  const tenant = tenantCookie?.trim() || null;

  const missingRole = !role;
  const missingTenant = !tenant;
  const staleRole =
    Boolean(roleCookie) &&
    roleCookie!.trim().length > 0 &&
    !role;

  if (!missingRole && !missingTenant && !staleRole) {
    return { action: "continue" };
  }

  const attempt = parseRefreshAttempt(
    request.nextUrl.searchParams.get(SESSION_REFRESH_ATTEMPT_PARAM)
  );

  const reason = missingRole
    ? "missing_role_cookie"
    : missingTenant
      ? "missing_tenant_cookie"
      : "stale_role_cookie";

  logAdminSession("session_desync", {
    pathname,
    reason,
    userId,
    attempt,
    cookieRole: roleCookie ?? null,
    cookieTenant: tenantCookie ?? null,
  });

  if (attempt >= MAX_SESSION_REFRESH_ATTEMPTS) {
    const loginPath = pathname.startsWith("/admin")
      ? `/admin/login?error=session_recovery_failed&next=${encodeURIComponent(pathname)}`
      : `/dashboard/login?error=session_recovery_failed&next=${encodeURIComponent(pathname)}`;
    return { action: "login", redirectTo: loginPath, reason };
  }

  const nextAttempt = attempt + 1;
  const redirectTo = buildRefreshSessionUrl(
    request.nextUrl.origin,
    pathname,
    nextAttempt
  );

  return { action: "refresh", redirectTo, reason };
}
