/**
 * Newsroom team management — auth.users + tenant_memberships (service role)
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  CANONICAL_ROLES,
  normalizeDashboardRole,
  type CanonicalRole,
} from "@/lib/saas-auth/roles";
import type { MembershipStatus } from "@/lib/saas-auth/types";

export type TeamMemberRecord = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: CanonicalRole;
  status: MembershipStatus;
  createdAt: string;
  lastLoginAt: string | null;
};

export { CANONICAL_ROLES };

function mapRow(row: {
  id: string;
  user_id: string;
  email: string;
  display_name?: string | null;
  role: string;
  status: string;
  created_at: string;
  last_login_at?: string | null;
}): TeamMemberRecord {
  const email = row.email?.trim().toLowerCase() ?? "";
  const displayName =
    row.display_name?.trim() ||
    email.split("@")[0] ||
    "Staff";

  return {
    id: row.id,
    userId: row.user_id,
    email,
    displayName,
    role: normalizeDashboardRole(row.role),
    status: row.status as MembershipStatus,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? null,
  };
}

export async function listTenantTeamMembers(
  tenantId: string
): Promise<TeamMemberRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("tenant_memberships")
    .select(
      "id, user_id, email, display_name, role, status, created_at, last_login_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapRow);
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
        error: createError?.message ?? "auth_user_create_failed",
      };
    }
    userId = created.user.id;
  }

  const { data: membership, error: memberError } = await supabase
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id: input.tenantId,
        user_id: userId,
        email,
        display_name: displayName,
        role,
        status: "active",
        invited_by: input.invitedBy,
        last_login_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,user_id" }
    )
    .select(
      "id, user_id, email, display_name, role, status, created_at, last_login_at"
    )
    .single();

  if (memberError || !membership) {
    return { ok: false, error: memberError?.message ?? "membership_upsert_failed" };
  }

  return { ok: true, member: mapRow(membership) };
}

export async function updateTeamMemberRole(input: {
  tenantId: string;
  membershipId: string;
  role: CanonicalRole;
  actorUserId: string;
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

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setTeamMemberStatus(input: {
  tenantId: string;
  membershipId: string;
  status: MembershipStatus;
  actorUserId: string;
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

  if (error) return { ok: false, error: error.message };
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

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
