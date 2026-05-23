import { NextResponse } from "next/server";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { getDashboardSession } from "@/lib/saas-auth/session";
import type { DashboardPermission, DashboardSession } from "@/lib/saas-auth/types";

export type GuardResult =
  | { ok: true; session: DashboardSession }
  | { ok: false; response: NextResponse };

export async function requireDashboardSession(
  request: Request,
  permission?: DashboardPermission
): Promise<GuardResult> {
  const session = await getDashboardSession(request);

  if (!session) {
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
