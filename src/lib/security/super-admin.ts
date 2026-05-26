/**
 * Super-admin action protections
 */

import { isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { SUPER_ADMIN_ACTION_LIMIT } from "@/lib/security/constants";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { logSecurityAudit } from "@/lib/security/audit";
import type { DashboardSession } from "@/lib/saas-auth/types";

export async function guardSuperAdminAction(
  session: DashboardSession,
  action: string,
  request: Request
): Promise<Response | null> {
  if (!isSuperAdmin(session.membership.role)) {
    return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const limit = await checkRateLimit(
    `super:${session.userId}:${action}`,
    SUPER_ADMIN_ACTION_LIMIT.maxAttempts,
    SUPER_ADMIN_ACTION_LIMIT.windowSec
  );

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSec);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await logSecurityAudit({
    tenantId: session.membership.tenantId,
    actorUserId: session.userId,
    actorEmail: session.email,
    action: "admin.super_action",
    resourceType: action,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
  });

  return null;
}
