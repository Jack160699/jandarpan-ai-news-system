/**
 * Idempotent newsroom auth bootstrap — tenant + membership for Supabase users
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  getDefaultTenant,
  getTenantBySlug,
  upsertTenantToDatabase,
} from "@/lib/tenant/registry";
import {
  normalizeDashboardRole,
  resolveRoleForEmail,
  type CanonicalRole,
} from "@/lib/saas-auth/roles";

export type BootstrapResult = {
  ok: boolean;
  tenantId?: string;
  tenantSlug?: string;
  membershipId?: string;
  role?: CanonicalRole;
  createdTenant?: boolean;
  createdMembership?: boolean;
  error?: string;
};

export async function ensureNewsroomTenant(
  slug?: string
): Promise<{ tenantId: string; tenantSlug: string; created: boolean }> {
  const preset = slug ? getTenantBySlug(slug) ?? getDefaultTenant() : getDefaultTenant();
  const supabase = createAdminServerClient();

  const { data: existing } = await supabase
    .from("newsroom_tenants")
    .select("id, slug, name")
    .eq("slug", preset.slug)
    .maybeSingle();

  const upsert = await upsertTenantToDatabase(preset);
  if (!upsert.ok) {
    throw new Error(upsert.error ?? "tenant_upsert_failed");
  }

  if (existing?.id) {
    await supabase
      .from("newsroom_tenants")
      .update({ name: preset.branding.nameEn, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    return {
      tenantId: existing.id,
      tenantSlug: existing.slug,
      created: false,
    };
  }

  const { data: row, error } = await supabase
    .from("newsroom_tenants")
    .select("id, slug")
    .eq("slug", preset.slug)
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? "tenant_lookup_failed");
  }

  await supabase.from("tenant_billing").upsert(
    {
      tenant_id: row.id,
      plan_id: "starter",
      plan_status: "trialing",
    },
    { onConflict: "tenant_id" }
  );

  return {
    tenantId: row.id,
    tenantSlug: row.slug,
    created: true,
  };
}

export async function ensureTenantMembership(input: {
  userId: string;
  email: string;
  tenantId: string;
  role?: CanonicalRole;
}): Promise<{ membershipId: string; role: CanonicalRole; created: boolean }> {
  const supabase = createAdminServerClient();
  const email = input.email.trim().toLowerCase();

  const { data: existing } = await supabase
    .from("tenant_memberships")
    .select("id, role")
    .eq("tenant_id", input.tenantId)
    .eq("user_id", input.userId)
    .maybeSingle();

  const role = input.role ?? resolveRoleForEmail(email, existing?.role);

  const row = {
    tenant_id: input.tenantId,
    user_id: input.userId,
    email,
    role,
    status: "active" as const,
    last_login_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("tenant_memberships")
    .upsert(row, { onConflict: "tenant_id,user_id" })
    .select("id, role")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "membership_upsert_failed");
  }

  return {
    membershipId: data.id,
    role: normalizeDashboardRole(data.role),
    created: !existing,
  };
}

export async function bootstrapNewsroomAuth(input: {
  userId: string;
  email: string;
  tenantSlug?: string;
  forceRole?: CanonicalRole;
}): Promise<BootstrapResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const tenant = await ensureNewsroomTenant(input.tenantSlug);
    const role =
      input.forceRole ?? resolveRoleForEmail(input.email);

    const membership = await ensureTenantMembership({
      userId: input.userId,
      email: input.email,
      tenantId: tenant.tenantId,
      role,
    });

    return {
      ok: true,
      tenantId: tenant.tenantId,
      tenantSlug: tenant.tenantSlug,
      membershipId: membership.membershipId,
      role: membership.role,
      createdTenant: tenant.created,
      createdMembership: membership.created,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "bootstrap_failed",
    };
  }
}
