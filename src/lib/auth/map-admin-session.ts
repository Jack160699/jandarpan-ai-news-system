import type { AdminSessionResponse } from "@/lib/auth/admin-session-types";
import { logAdminSession } from "@/lib/auth/admin-session-log";
import { permissionsForRole } from "@/lib/newsroom-auth/role-permissions";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import type { DashboardSession } from "@/lib/saas-auth/types";

export function mapDashboardToAdminSession(
  session: DashboardSession
): AdminSessionResponse | null {
  if (!session.membership?.role?.trim()) {
    logAdminSession("missing_membership", { userId: session.userId });
    return null;
  }

  const role = normalizeDashboardRole(session.membership.role);
  return {
    ok: true,
    user: {
      id: session.userId,
      email: session.email,
      isDevBypass: session.isDevBypass,
    },
    membership: { ...session.membership, role },
    permissions: permissionsForRole(role),
  };
}
