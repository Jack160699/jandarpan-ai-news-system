/**
 * Newsroom team management — auth.users + tenant_memberships (service role)
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  queryTenantMembershipList,
  upsertTenantMembership,
} from "@/lib/newsroom-auth/membership-write";
import { permissionLabelsForRole } from "@/lib/newsroom-auth/role-permissions";
import { formatTeamApiError } from "@/lib/newsroom-auth/schema-errors";
import { jsonObjectFrom } from "@/types/json";
import {
  CANONICAL_ROLES,
  normalizeDashboardRole,
  type CanonicalRole,
} from "@/lib/saas-auth/roles";
import type { MembershipStatus } from "@/lib/saas-auth/types";
import {
  formatMemberDisplayName,
  type TeamActivity,
  type TeamMember,
  type TenantMembershipDbRow,
} from "@/lib/types/team";
import { logPermissionChange } from "@/lib/security/audit";

export function avatarHueFromEmail(email: string): number {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export type TeamMemberRecord = TeamMember;
export type TeamActivityRecord = TeamActivity;

export { CANONICAL_ROLES };

function mapRow(row: TenantMembershipDbRow): TeamMemberRecord {
  const email = row.email?.trim().toLowerCase() ?? "";
  const meta = jsonObjectFrom(row.metadata);
  const metaFullName =
    typeof meta.full_name === "string" ? meta.full_name.trim() : null;

  const displayName = formatMemberDisplayName({
    display_name: row.display_name,
    full_name: metaFullName,
    displayName: row.display_name ?? "",
    fullName: metaFullName,
    email,
  });

  const role = normalizeDashboardRole(row.role);

  return {
    id: row.id,
    userId: row.user_id,
    email,
    displayName,
    fullName: metaFullName,
    role,
    status: row.status as MembershipStatus,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
    joinedAt: row.joined_at ?? row.created_at,
    lastLoginAt: row.last_login_at ?? null,
    avatarHue: avatarHueFromEmail(email),
    permissions: permissionLabelsForRole(role),
  };
}

export async function listTenantTeamMembers(
  tenantId: string
): Promise<TeamMemberRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await queryTenantMembershipList(tenantId);

  if (error) {
    console.error("[team] list failed:", error.message);
    throw new Error(error.message);
  }

  const members = data.map(mapRow);
  return enrichMembersWithAuthSignIn(members);
}

async function enrichMembersWithAuthSignIn(
  members: TeamMemberRecord[]
): Promise<TeamMemberRecord[]> {
  const supabase = createAdminServerClient();
  const { data: authData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (!authData?.users?.length) return members;

  const byId = new Map(
    authData.users.map((u) => [
      u.id,
      {
        lastSignIn: u.last_sign_in_at ?? null,
        metaName:
          (u.user_metadata?.full_name as string | undefined)?.trim() || null,
      },
    ])
  );

  return members.map((m) => {
    const auth = byId.get(m.userId);
    if (!auth) return m;
    const lastLoginAt =
      m.lastLoginAt ||
      (auth.lastSignIn ? new Date(auth.lastSignIn).toISOString() : null);
    const displayName = formatMemberDisplayName({
      displayName: m.displayName,
      fullName: m.fullName ?? auth.metaName,
      email: m.email,
    });
    return {
      ...m,
      displayName,
      fullName: m.fullName || auth.metaName,
      lastLoginAt,
    };
  });
}

export async function listTeamActivity(
  tenantId: string,
  limit = 40
): Promise<TeamActivityRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("editorial_audit_log")
    .select("id, action, user_email, resource_id, payload, created_at")
    .eq("tenant_id", tenantId)
    .like("action", "team_%")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    userEmail: row.user_email,
    resourceId: row.resource_id,
    payload: jsonObjectFrom(row.payload),
    createdAt: row.created_at,
  }));
}

export async function touchMembershipLastLogin(
  userId: string,
  tenantId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createAdminServerClient();
  await supabase
    .from("tenant_memberships")
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);
}

export async function countSuperAdmins(
  tenantId: string,
  excludeMembershipId?: string
): Promise<number> {
  const supabase = createAdminServerClient();
  let query = supabase
    .from("tenant_memberships")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", "super_admin")
    .eq("status", "active");

  if (excludeMembershipId) {
    query = query.neq("id", excludeMembershipId);
  }

  const { count } = await query;
  return count ?? 0;
}

export async function findAuthUserByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const supabase = createAdminServerClient();
  const normalized = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) return null;
  const user = data.users.find(
    (u) => u.email?.toLowerCase() === normalized
  );
  if (!user?.id) return null;
  return { id: user.id, email: user.email ?? normalized };
}

export async function createNewsroomStaff(input: {
  tenantId: string;
  email: string;
  password: string;
  fullName: string;
  role: CanonicalRole;
  invitedBy: string;
}): Promise<{ ok: boolean; error?: string; member?: TeamMemberRecord }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const email = input.email.trim().toLowerCase();
  const displayName = input.fullName.trim();
  const role = normalizeDashboardRole(input.role);

  if (!email || !input.password || input.password.length < 8) {
    return { ok: false, error: "password_min_8_chars" };
  }

  if (!CANONICAL_ROLES.includes(role)) {
    return { ok: false, error: "invalid_role" };
  }

  const supabase = createAdminServerClient();

  let userId: string;
  const existing = await findAuthUserByEmail(email);

  if (existing) {
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: displayName },
    });
  } else {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });

    if (createError || !created.user) {
      return {
        ok: false,
        error: formatTeamApiError(
          createError?.message ?? "auth_user_create_failed"
        ),
      };
    }
    userId = created.user.id;
  }

  const { data: membership, error: memberError } = await upsertTenantMembership(
    {
      tenantId: input.tenantId,
      userId,
      email,
      displayName,
      role,
      status: "active",
      invitedBy: input.invitedBy,
      lastLoginAt: null,
    }
  );

  if (memberError || !membership) {
    return {
      ok: false,
      error: formatTeamApiError(
        memberError?.message ?? "membership_upsert_failed"
      ),
    };
  }

  return { ok: true, member: mapRow(membership) };
}

export async function inviteNewsroomMember(input: {
  tenantId: string;
  email: string;
  fullName: string;
  role: CanonicalRole;
  invitedBy: string;
}): Promise<{ ok: boolean; error?: string; member?: TeamMemberRecord }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const email = input.email.trim().toLowerCase();
  const displayName = input.fullName.trim();
  const role = normalizeDashboardRole(input.role);

  if (!email || !displayName) {
    return { ok: false, error: "email_name_required" };
  }

  const supabase = createAdminServerClient();
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  ).replace(/\/$/, "");

  let userId: string;
  const existing = await findAuthUserByEmail(email);

  if (existing) {
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: displayName },
    });
  } else {
    const redirectTo = `${siteUrl}/admin/login`;
    const { data: invited, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name: displayName },
        redirectTo,
      });

    if (inviteError) {
      const { data: created, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: false,
          user_metadata: { full_name: displayName },
        });
      if (createError || !created.user) {
        return {
          ok: false,
          error: formatTeamApiError(
            inviteError.message ?? createError?.message ?? "invite_failed"
          ),
        };
      }
      userId = created.user.id;
    } else {
      userId = invited.user.id;
    }
  }

  const { data: membership, error: memberError } = await upsertTenantMembership(
    {
      tenantId: input.tenantId,
      userId,
      email,
      displayName,
      role,
      status: "invited",
      invitedBy: input.invitedBy,
    }
  );

  if (memberError || !membership) {
    return {
      ok: false,
      error: formatTeamApiError(
        memberError?.message ?? "membership_upsert_failed"
      ),
    };
  }

  return { ok: true, member: mapRow(membership) };
}

export async function resetTeamMemberPassword(input: {
  tenantId: string;
  membershipId: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  if (!input.password || input.password.length < 8) {
    return { ok: false, error: "password_min_8_chars" };
  }

  const supabase = createAdminServerClient();

  const { data: member } = await supabase
    .from("tenant_memberships")
    .select("user_id")
    .eq("id", input.membershipId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (!member?.user_id) {
    return { ok: false, error: "membership_not_found" };
  }

  const { error } = await supabase.auth.admin.updateUserById(member.user_id, {
    password: input.password,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateTeamMemberRole(input: {
  tenantId: string;
  membershipId: string;
  role: CanonicalRole;
  actorUserId: string;
  actorEmail?: string;
  ipAddress?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const role = normalizeDashboardRole(input.role);
  const supabase = createAdminServerClient();

  const { data: target } = await supabase
    .from("tenant_memberships")
    .select("id, user_id, role, status")
    .eq("id", input.membershipId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (!target) return { ok: false, error: "membership_not_found" };

  if (
    target.role === "super_admin" &&
    role !== "super_admin" &&
    target.user_id === input.actorUserId
  ) {
    const others = await countSuperAdmins(input.tenantId, input.membershipId);
    if (others === 0) {
      return { ok: false, error: "cannot_demote_last_super_admin" };
    }
  }

  if (target.role === "super_admin" && role !== "super_admin") {
    const others = await countSuperAdmins(input.tenantId, input.membershipId);
    if (others === 0) {
      return { ok: false, error: "cannot_remove_last_super_admin" };
    }
  }

  const { error } = await supabase
    .from("tenant_memberships")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", input.membershipId)
    .eq("tenant_id", input.tenantId);

  if (error) return { ok: false, error: formatTeamApiError(error.message) };

  await logPermissionChange({
    tenantId: input.tenantId,
    targetUserId: target.user_id,
    changedByUserId: input.actorUserId,
    changedByEmail: input.actorEmail,
    previousRole: target.role,
    newRole: role,
    previousStatus: target.status,
    newStatus: target.status,
    ipAddress: input.ipAddress,
  });

  return { ok: true };
}

export async function setTeamMemberStatus(input: {
  tenantId: string;
  membershipId: string;
  status: MembershipStatus;
  actorUserId: string;
  actorEmail?: string;
  ipAddress?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = createAdminServerClient();

  const { data: target } = await supabase
    .from("tenant_memberships")
    .select("id, user_id, role, status")
    .eq("id", input.membershipId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (!target) return { ok: false, error: "membership_not_found" };

  if (
    input.status === "suspended" &&
    target.role === "super_admin" &&
    target.status === "active"
  ) {
    const others = await countSuperAdmins(input.tenantId, input.membershipId);
    if (others === 0) {
      return { ok: false, error: "cannot_suspend_last_super_admin" };
    }
  }

  const { error } = await supabase
    .from("tenant_memberships")
    .update({
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.membershipId)
    .eq("tenant_id", input.tenantId);

  if (error) return { ok: false, error: formatTeamApiError(error.message) };

  await logPermissionChange({
    tenantId: input.tenantId,
    targetUserId: target.user_id,
    changedByUserId: input.actorUserId,
    changedByEmail: input.actorEmail,
    previousRole: target.role,
    newRole: target.role,
    previousStatus: target.status,
    newStatus: input.status,
    ipAddress: input.ipAddress,
  });

  return { ok: true };
}

export async function removeTeamMember(input: {
  tenantId: string;
  membershipId: string;
  actorUserId: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = createAdminServerClient();

  const { data: target } = await supabase
    .from("tenant_memberships")
    .select("id, user_id, role")
    .eq("id", input.membershipId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (!target) return { ok: false, error: "membership_not_found" };

  if (target.role === "super_admin") {
    const others = await countSuperAdmins(input.tenantId, input.membershipId);
    if (others === 0) {
      return { ok: false, error: "cannot_remove_last_super_admin" };
    }
  }

  const { error } = await supabase
    .from("tenant_memberships")
    .delete()
    .eq("id", input.membershipId)
    .eq("tenant_id", input.tenantId);

  if (error) return { ok: false, error: formatTeamApiError(error.message) };
  return { ok: true };
}
