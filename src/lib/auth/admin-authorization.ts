/**
 * Canonical server-side admin authorization helpers.
 * UI gates are UX only — APIs and layouts must use these.
 */

import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { getDashboardSession } from "@/lib/saas-auth/session";
import type {
  DashboardPermission,
  DashboardSession,
} from "@/lib/saas-auth/types";
import { logAdminAccessDenied } from "@/lib/security/admin-access-log";
import { getClientIp, getUserAgent } from "@/lib/security/request-context";

export type AdminAuthorizationContext = {
  session: DashboardSession;
  role: string;
  permissions: DashboardPermission[];
  isSuperAdmin: boolean;
};

export type AdminAuthResult =
  | { ok: true; session: DashboardSession; ctx: AdminAuthorizationContext }
  | { ok: false; response: NextResponse };

function jsonError(status: 401 | 403, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

function buildContext(session: DashboardSession): AdminAuthorizationContext {
  const role = session.membership.role;
  const permissions = (
    [
      "analytics:read",
      "content:read",
      "content:write",
      "editorial:write",
      "publish:write",
      "team:read",
      "team:write",
      "billing:read",
      "billing:write",
      "monitoring:read",
      "providers:read",
    ] as DashboardPermission[]
  ).filter((p) => roleHasPermission(role, p));

  return {
    session,
    role,
    permissions,
    isSuperAdmin: isSuperAdmin(role),
  };
}

export async function getAdminAuthorizationContext(
  request?: Request
): Promise<AdminAuthorizationContext | null> {
  const session = await getDashboardSession(request);
  if (!session) return null;
  return buildContext(session);
}

/** Authenticated admin with active membership (any role). */
export async function requireAdminSession(
  request: Request
): Promise<AdminAuthResult> {
  const session = await getDashboardSession(request);
  if (!session) {
    await logAdminAccessDenied({
      request,
      reason: "unauthenticated",
      resourceType: "admin_session",
    });
    return { ok: false, response: jsonError(401, "unauthorized") };
  }
  return { ok: true, session, ctx: buildContext(session) };
}

export async function requireAdminPermission(
  request: Request,
  permission: DashboardPermission
): Promise<AdminAuthResult> {
  const base = await requireAdminSession(request);
  if (!base.ok) return base;

  if (!roleHasPermission(base.session.membership.role, permission)) {
    await logAdminAccessDenied({
      request,
      reason: "permission_denied",
      resourceType: "permission",
      resourceId: permission,
      session: base.session,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
    return { ok: false, response: jsonError(403, "forbidden") };
  }

  return base;
}

export async function requireAnyAdminPermission(
  request: Request,
  permissions: DashboardPermission[]
): Promise<AdminAuthResult> {
  const base = await requireAdminSession(request);
  if (!base.ok) return base;

  const allowed = permissions.some((p) =>
    roleHasPermission(base.session.membership.role, p)
  );
  if (!allowed) {
    await logAdminAccessDenied({
      request,
      reason: "permission_denied",
      resourceType: "permission_any",
      resourceId: permissions.join("|"),
      session: base.session,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
    return { ok: false, response: jsonError(403, "forbidden") };
  }

  return base;
}

export async function requireSuperAdmin(
  request: Request
): Promise<AdminAuthResult> {
  const base = await requireAdminSession(request);
  if (!base.ok) return base;

  if (!base.ctx.isSuperAdmin) {
    await logAdminAccessDenied({
      request,
      reason: "super_admin_required",
      resourceType: "role",
      resourceId: "super_admin",
      session: base.session,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
    return { ok: false, response: jsonError(403, "forbidden") };
  }

  return base;
}

export function sessionHasPermission(
  session: DashboardSession,
  permission: DashboardPermission
): boolean {
  return roleHasPermission(session.membership.role, permission);
}

export function sessionHasAnyPermission(
  session: DashboardSession,
  permissions: DashboardPermission[]
): boolean {
  return permissions.some((p) => roleHasPermission(session.membership.role, p));
}
