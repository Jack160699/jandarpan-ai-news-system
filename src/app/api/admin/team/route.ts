/**
 * Admin team management — super_admin only
 * GET list + activity | POST create/invite | PATCH role/status/password | DELETE remove
 */

import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { rolePermissionsMatrix } from "@/lib/newsroom-auth/role-permissions";
import { requireSuperAdminSession } from "@/lib/newsroom-auth/require-super-admin";
import {
  CANONICAL_ROLES,
  createNewsroomStaff,
  inviteNewsroomMember,
  listTeamActivity,
  listTenantTeamMembers,
  removeTeamMember,
  resetTeamMemberPassword,
  setTeamMemberStatus,
  updateTeamMemberRole,
} from "@/lib/newsroom-auth/team-management";
import type { CanonicalRole } from "@/lib/saas-auth/roles";
import type { MembershipStatus } from "@/lib/saas-auth/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  const tenantId = guard.session.membership.tenantId;
  const [team, activity] = await Promise.all([
    listTenantTeamMembers(tenantId),
    listTeamActivity(tenantId),
  ]);

  return NextResponse.json({
    ok: true,
    team,
    activity,
    permissions: rolePermissionsMatrix(),
    tenant: {
      id: tenantId,
      slug: guard.session.membership.tenantSlug,
      name: guard.session.membership.tenantName,
    },
  });
}

export async function POST(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  const body = (await request.json()) as {
    mode?: "create" | "invite";
    email?: string;
    password?: string;
    fullName?: string;
    role?: CanonicalRole;
  };

  const mode = body.mode ?? "create";
  const tenantId = guard.session.membership.tenantId;

  if (!body.email || !body.fullName || !body.role) {
    return NextResponse.json(
      { ok: false, error: "email_name_role_required" },
      { status: 400 }
    );
  }

  if (!CANONICAL_ROLES.includes(body.role)) {
    return NextResponse.json({ ok: false, error: "invalid_role" }, { status: 400 });
  }

  if (mode === "invite") {
    const result = await inviteNewsroomMember({
      tenantId,
      email: body.email,
      fullName: body.fullName,
      role: body.role,
      invitedBy: guard.session.userId,
    });

    if (result.ok) {
      await logEditorialAudit({
        session: guard.session,
        action: "team_invite",
        resourceType: "membership",
        resourceId: result.member?.id,
        payload: { email: body.email, role: body.role },
      });
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (!body.password) {
    return NextResponse.json(
      { ok: false, error: "password_required_for_create" },
      { status: 400 }
    );
  }

  const result = await createNewsroomStaff({
    tenantId,
    email: body.email,
    password: body.password,
    fullName: body.fullName,
    role: body.role,
    invitedBy: guard.session.userId,
  });

  if (result.ok) {
    await logEditorialAudit({
      session: guard.session,
      action: "team_create",
      resourceType: "membership",
      resourceId: result.member?.id,
      payload: {
        email: body.email,
        role: body.role,
        fullName: body.fullName,
      },
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function PATCH(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  const body = (await request.json()) as {
    membershipId?: string;
    role?: CanonicalRole;
    status?: MembershipStatus;
    password?: string;
  };

  if (!body.membershipId) {
    return NextResponse.json(
      { ok: false, error: "membershipId_required" },
      { status: 400 }
    );
  }

  const tenantId = guard.session.membership.tenantId;
  const actorUserId = guard.session.userId;

  if (body.password) {
    const result = await resetTeamMemberPassword({
      tenantId,
      membershipId: body.membershipId,
      password: body.password,
    });

    if (result.ok) {
      await logEditorialAudit({
        session: guard.session,
        action: "team_password_reset",
        resourceType: "membership",
        resourceId: body.membershipId,
        payload: {},
      });
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (body.role) {
    if (!CANONICAL_ROLES.includes(body.role)) {
      return NextResponse.json({ ok: false, error: "invalid_role" }, { status: 400 });
    }

    const result = await updateTeamMemberRole({
      tenantId,
      membershipId: body.membershipId,
      role: body.role,
      actorUserId,
    });

    if (result.ok) {
      await logEditorialAudit({
        session: guard.session,
        action: "team_role_change",
        resourceType: "membership",
        resourceId: body.membershipId,
        payload: { role: body.role },
      });
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (body.status) {
    if (!["active", "invited", "suspended"].includes(body.status)) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }

    const result = await setTeamMemberStatus({
      tenantId,
      membershipId: body.membershipId,
      status: body.status,
      actorUserId,
    });

    if (result.ok) {
      await logEditorialAudit({
        session: guard.session,
        action:
          body.status === "active" ? "team_reactivate" : "team_suspend",
        resourceType: "membership",
        resourceId: body.membershipId,
        payload: { status: body.status },
      });
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json(
    { ok: false, error: "role_status_or_password_required" },
    { status: 400 }
  );
}

export async function DELETE(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  const body = (await request.json()) as { membershipId?: string };

  if (!body.membershipId) {
    return NextResponse.json(
      { ok: false, error: "membershipId_required" },
      { status: 400 }
    );
  }

  const result = await removeTeamMember({
    tenantId: guard.session.membership.tenantId,
    membershipId: body.membershipId,
    actorUserId: guard.session.userId,
  });

  if (result.ok) {
    await logEditorialAudit({
      session: guard.session,
      action: "team_remove",
      resourceType: "membership",
      resourceId: body.membershipId,
      payload: {},
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
