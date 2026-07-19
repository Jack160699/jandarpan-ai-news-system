import { NextResponse } from "next/server";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { getDashboardSession } from "@/lib/saas-auth/session";
import type { DashboardPermission, DashboardSession } from "@/lib/saas-auth/types";
import { logAdminAccessDenied } from "@/lib/security/admin-access-log";
import { logSecurityAudit } from "@/lib/security/audit";
import { getClientIp, getUserAgent } from "@/lib/security/request-context";

export type GuardResult =
  | { ok: true; session: DashboardSession }
  | { ok: false; response: NextResponse };

export async function requireDashboardSession(
  request: Request,
  permission?: DashboardPermission
): Promise<GuardResult> {
  const session = await getDashboardSession(request);

  if (!session) {
    await logAdminAccessDenied({
      request,
      reason: "unauthenticated",
      resourceType: "admin_session",
      resourceId: permission,
    });
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (
    permission &&
    !roleHasPermission(session.membership.role, permission)
  ) {
    await logAdminAccessDenied({
      request,
      reason: "permission_denied",
      resourceType: "permission",
      resourceId: permission,
      session,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
    await logSecurityAudit({
      tenantId: session.membership.tenantId,
      actorUserId: session.userId,
      actorEmail: session.email,
      action: "api.forbidden",
      resourceType: "permission",
      resourceId: permission,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session };
}
