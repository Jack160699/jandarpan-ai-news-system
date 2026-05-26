/**
 * Admin team management — super_admin only
 * GET list + activity | POST create/invite | PATCH role/status/password | DELETE remove
 */

import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { rolePermissionsMatrix } from "@/lib/newsroom-auth/role-permissions";
import { requireSuperAdminSession } from "@/lib/newsroom-auth/require-super-admin";
import { formatTeamApiError } from "@/lib/newsroom-auth/schema-errors";
import {
  createNewsroomStaff,
  inviteNewsroomMember,
  listTeamActivity,
  listTenantTeamMembers,
  removeTeamMember,
  resetTeamMemberPassword,
  setTeamMemberStatus,
  updateTeamMemberRole,
} from "@/lib/newsroom-auth/team-management";
import {
  teamDeleteBodySchema,
  teamPatchBodySchema,
  teamPostBodySchema,
} from "@/lib/newsroom-auth/team-schemas";
import { guardSuperAdminAction } from "@/lib/security/super-admin";
import { getClientIp } from "@/lib/security/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  const tenantId = guard.session.membership.tenantId;

  try {
    const [team, activity] = await Promise.all([
      listTenantTeamMembers(tenantId),
      listTeamActivity(tenantId),
    ]);

    return NextResponse.json({
      ok: true,
      team,
      activity,
      recovery: false,
      permissions: rolePermissionsMatrix(),
      tenant: {
        id: tenantId,
        slug: guard.session.membership.tenantSlug,
        name: guard.session.membership.tenantName,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "team_service_unavailable";
    return NextResponse.json({
      ok: true,
      recovery: true,
      team: [],
      activity: [],
      error: formatTeamApiError(message),
      permissions: rolePermissionsMatrix(),
      tenant: {
        id: tenantId,
        slug: guard.session.membership.tenantSlug,
        name: guard.session.membership.tenantName,
      },
    });
  }
}

export async function POST(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const parsed = teamPostBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue?.message ?? "validation_failed" },
      { status: 400 }
    );
  }

  const tenantId = guard.session.membership.tenantId;
  const payload = parsed.data;

  if (payload.mode === "invite") {
    const result = await inviteNewsroomMember({
      tenantId,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      invitedBy: guard.session.userId,
    });

    if (result.ok) {
      await logEditorialAudit({
        session: guard.session,
        action: "team_invite",
        resourceType: "membership",
        resourceId: result.member?.id,
        payload: { email: payload.email, role: payload.role },
      });
    }

    return NextResponse.json(
      {
        ...result,
        error: result.error ? formatTeamApiError(result.error) : undefined,
      },
      { status: result.ok ? 200 : 400 }
    );
  }

  const result = await createNewsroomStaff({
    tenantId,
    email: payload.email,
    password: payload.password,
    fullName: payload.fullName,
    role: payload.role,
    invitedBy: guard.session.userId,
  });

  if (result.ok) {
    await logEditorialAudit({
      session: guard.session,
      action: "team_create",
      resourceType: "membership",
      resourceId: result.member?.id,
      payload: {
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
      },
    });
  }

  return NextResponse.json(
    {
      ...result,
      error: result.error ? formatTeamApiError(result.error) : undefined,
    },
    { status: result.ok ? 200 : 400 }
  );
}

export async function PATCH(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  const superBlock = await guardSuperAdminAction(
    guard.session,
    "team.patch",
    request
  );
  if (superBlock) return superBlock;

  const clientIp = getClientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const parsed = teamPatchBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue?.message ?? "validation_failed" },
      { status: 400 }
    );
  }

  const { membershipId, role, status, password } = parsed.data;
  const tenantId = guard.session.membership.tenantId;
  const actorUserId = guard.session.userId;

  if (password) {
    const result = await resetTeamMemberPassword({
      tenantId,
      membershipId,
      password,
    });

    if (result.ok) {
      await logEditorialAudit({
        session: guard.session,
        action: "team_password_reset",
        resourceType: "membership",
        resourceId: membershipId,
        payload: {},
      });
    }

    return NextResponse.json(
      {
        ...result,
        error: result.error ? formatTeamApiError(result.error) : undefined,
      },
      { status: result.ok ? 200 : 400 }
    );
  }

  if (role) {
    const result = await updateTeamMemberRole({
      tenantId,
      membershipId,
      role,
      actorUserId,
      actorEmail: guard.session.email,
      ipAddress: clientIp,
    });

    if (result.ok) {
      await logEditorialAudit({
        session: guard.session,
        action: "team_role_change",
        resourceType: "membership",
        resourceId: membershipId,
        payload: { role },
      });
    }

    return NextResponse.json(
      {
        ...result,
        error: result.error ? formatTeamApiError(result.error) : undefined,
      },
      { status: result.ok ? 200 : 400 }
    );
  }

  if (status) {
    const result = await setTeamMemberStatus({
      tenantId,
      membershipId,
      status,
      actorUserId,
      actorEmail: guard.session.email,
      ipAddress: clientIp,
    });

    if (result.ok) {
      await logEditorialAudit({
        session: guard.session,
        action: status === "active" ? "team_reactivate" : "team_suspend",
        resourceType: "membership",
        resourceId: membershipId,
        payload: { status },
      });
    }

    return NextResponse.json(
      {
        ...result,
        error: result.error ? formatTeamApiError(result.error) : undefined,
      },
      { status: result.ok ? 200 : 400 }
    );
  }

  return NextResponse.json(
    { ok: false, error: "role_status_or_password_required" },
    { status: 400 }
  );
}

export async function DELETE(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const parsed = teamDeleteBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue?.message ?? "validation_failed" },
      { status: 400 }
    );
  }

  const result = await removeTeamMember({
    tenantId: guard.session.membership.tenantId,
    membershipId: parsed.data.membershipId,
    actorUserId: guard.session.userId,
  });

  if (result.ok) {
    await logEditorialAudit({
      session: guard.session,
      action: "team_remove",
      resourceType: "membership",
      resourceId: parsed.data.membershipId,
      payload: {},
    });
  }

  return NextResponse.json(
    {
      ...result,
      error: result.error ? formatTeamApiError(result.error) : undefined,
    },
    { status: result.ok ? 200 : 400 }
  );
}
