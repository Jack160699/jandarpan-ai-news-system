import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import type { DashboardSession } from "@/lib/saas-auth/types";

export type SuperAdminGuardResult =
  | { ok: true; session: DashboardSession }
  | { ok: false; response: NextResponse };

export async function requireSuperAdminSession(
  request: Request
): Promise<SuperAdminGuardResult> {
  const guard = await requireDashboardSession(request, "team:read");

  if (!guard.ok) return guard;

  if (!isSuperAdmin(guard.session.membership.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "super_admin_required" },
        { status: 403 }
      ),
    };
  }

  return guard;
}
