/**
 * Safe admin access / denial audit events (no secrets in payloads).
 */

import type { DashboardSession } from "@/lib/saas-auth/types";
import { logSecurityAudit, type SecurityAuditAction } from "@/lib/security/audit";
import { getClientIp, getUserAgent } from "@/lib/security/request-context";

export type AdminAccessDenialReason =
  | "unauthenticated"
  | "permission_denied"
  | "super_admin_required"
  | "route_forbidden"
  | "session_invalid"
  | "session_expired"
  | "role_cookie_mismatch";

type DenialInput = {
  request?: Request;
  reason: AdminAccessDenialReason;
  resourceType?: string;
  resourceId?: string;
  pathname?: string;
  session?: DashboardSession | null;
  cookieRole?: string | null;
  trustedRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function actionForReason(reason: AdminAccessDenialReason): SecurityAuditAction {
  if (reason === "role_cookie_mismatch") return "admin.session_mismatch";
  if (reason === "session_invalid" || reason === "session_expired") {
    return "admin.session_invalid";
  }
  return "admin.access_denied";
}

export async function logAdminAccessDenied(input: DenialInput): Promise<void> {
  const ip =
    input.ipAddress ??
    (input.request ? getClientIp(input.request) : null);
  const ua =
    input.userAgent ??
    (input.request ? getUserAgent(input.request) : null);

  try {
    await logSecurityAudit({
      tenantId: input.session?.membership.tenantId ?? null,
      actorUserId: input.session?.userId ?? null,
      actorEmail: input.session?.email ?? null,
      action: actionForReason(input.reason),
      resourceType: input.resourceType ?? "admin",
      resourceId: input.resourceId,
      ipAddress: ip,
      userAgent: ua,
      metadata: {
        reason: input.reason,
        ...(input.pathname ? { pathname: input.pathname } : {}),
        ...(input.cookieRole != null ? { cookieRole: input.cookieRole } : {}),
        ...(input.trustedRole != null ? { trustedRole: input.trustedRole } : {}),
      },
    });
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.info("[admin-access-denied]", input.reason, input.resourceId);
    }
  }
}

export async function logAdminSessionMismatch(input: {
  session: DashboardSession;
  cookieRole: string | null;
  pathname?: string;
  request?: Request;
}): Promise<void> {
  await logAdminAccessDenied({
    request: input.request,
    reason: "role_cookie_mismatch",
    resourceType: "role_cookie",
    resourceId: input.cookieRole ?? "missing",
    pathname: input.pathname,
    session: input.session,
    cookieRole: input.cookieRole,
    trustedRole: input.session.membership.role,
  });
}
