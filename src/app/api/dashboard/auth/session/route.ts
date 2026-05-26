import { NextResponse } from "next/server";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { getDashboardSessionSafe } from "@/lib/saas-auth/session-safe";
import type { DashboardPermission } from "@/lib/saas-auth/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await getDashboardSessionSafe(request);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason, message: result.message },
      { status: result.reason === "timeout" ? 503 : 500 }
    );
  }

  const session = result.session;
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: session.userId,
      email: session.email,
      isDevBypass: session.isDevBypass,
    },
    membership: session.membership,
    permissions: getPermissionsForRole(session.membership.role),
  });
}

function getPermissionsForRole(role: string): DashboardPermission[] {
  const all: DashboardPermission[] = [
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
  ];
  return all.filter((p) => roleHasPermission(role as never, p));
}
