import { NextResponse } from "next/server";
import { inviteTeamMember, listTeamMembers, updateMemberRole } from "@/lib/dashboard/team";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import type { DashboardRole } from "@/lib/saas-auth/types";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "team:read");
  if (!guard.ok) return guard.response;

  const team = await listTeamMembers(guard.session.membership.tenantId);
  return NextResponse.json({ ok: true, team });
}

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "team:write");
  if (!guard.ok) return guard.response;
  if (!isSuperAdmin(guard.session.membership.role)) {
    return NextResponse.json({ ok: false, error: "super_admin_required" }, { status: 403 });
  }

  const body = (await request.json()) as { email?: string; role?: DashboardRole };
  if (!body.email || !body.role) {
    return NextResponse.json({ ok: false, error: "email_role_required" }, { status: 400 });
  }

  const result = await inviteTeamMember({
    session: guard.session,
    email: body.email,
    role: body.role,
  });

  if (result.ok) {
    await logEditorialAudit({
      session: guard.session,
      action: "team_invite",
      resourceType: "membership",
      payload: { email: body.email, role: body.role },
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function PATCH(request: Request) {
  const guard = await requireDashboardSession(request, "team:write");
  if (!guard.ok) return guard.response;
  if (!isSuperAdmin(guard.session.membership.role)) {
    return NextResponse.json({ ok: false, error: "super_admin_required" }, { status: 403 });
  }

  const body = (await request.json()) as {
    membershipId?: string;
    role?: DashboardRole;
  };

  if (!body.membershipId || !body.role) {
    return NextResponse.json(
      { ok: false, error: "membershipId_role_required" },
      { status: 400 }
    );
  }

  const result = await updateMemberRole(
    body.membershipId,
    guard.session.membership.tenantId,
    body.role
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
