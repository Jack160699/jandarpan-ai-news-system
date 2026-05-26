import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import type { DashboardRole, DashboardSession } from "@/lib/saas-auth/types";

export async function listTeamMembers(tenantId: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("tenant_memberships")
    .select("id, email, role, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function inviteTeamMember(input: {
  session: DashboardSession;
  email: string;
  role: DashboardRole;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: true };
  }

  const supabase = createAdminServerClient();
  const placeholderUserId = crypto.randomUUID();

  const { error } = await supabase.from("tenant_memberships").insert({
    tenant_id: input.session.membership.tenantId,
    user_id: placeholderUserId,
    email: input.email.trim().toLowerCase(),
    role: normalizeDashboardRole(String(input.role)),
    status: "invited",
    invited_by: input.session.userId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateMemberRole(
  membershipId: string,
  tenantId: string,
  role: DashboardRole
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("tenant_memberships")
    .update({
      role: normalizeDashboardRole(String(role)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
