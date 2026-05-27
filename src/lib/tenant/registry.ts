/**
 * Tenant registry — static presets + optional Supabase overlay
 */

import { CG_BHASKAR_TENANT } from "@/lib/tenant/presets/cg-bhaskar";
import { HAMAR_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/hamar-chhattisgarh";
import { JAN_DARPAN_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/jan-darpan-chhattisgarh";
import { PIONEER_POST_TENANT } from "@/lib/tenant/presets/pioneer-post";
import type { TenantConfig } from "@/lib/tenant/types";
import { normalizeTenantConfig } from "@/lib/tenant/validate";
import { asJson } from "@/types/json";

const STATIC_TENANTS: TenantConfig[] = [
  JAN_DARPAN_CHHATTISGARH_TENANT,
  HAMAR_CHHATTISGARH_TENANT,
  CG_BHASKAR_TENANT,
  PIONEER_POST_TENANT,
];

const BY_SLUG = new Map(STATIC_TENANTS.map((t) => [t.slug, t]));

const BY_DOMAIN = new Map<string, TenantConfig>();
for (const tenant of STATIC_TENANTS) {
  for (const domain of tenant.domains) {
    BY_DOMAIN.set(normalizeHost(domain), tenant);
  }
}

function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0].trim();
}

export function listStaticTenants(): TenantConfig[] {
  return [...STATIC_TENANTS];
}

export function getTenantBySlug(slug: string): TenantConfig | null {
  return BY_SLUG.get(slug) ?? null;
}

export function getTenantByDomain(host: string): TenantConfig | null {
  const key = normalizeHost(host);
  return BY_DOMAIN.get(key) ?? null;
}

export function getDefaultTenantSlug(): string {
  return (
    process.env.NEWSROOM_DEFAULT_TENANT?.trim() ||
    process.env.DEFAULT_TENANT_SLUG?.trim() ||
    "jan-darpan-chhattisgarh"
  );
}

export function getDefaultTenant(): TenantConfig {
  return getTenantBySlug(getDefaultTenantSlug()) ?? JAN_DARPAN_CHHATTISGARH_TENANT;
}

export async function loadTenantFromDatabase(
  slug: string
): Promise<TenantConfig | null> {
  try {
    const { createAdminServerClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from("newsroom_tenants")
      .select("id,slug,status,domains,config,updated_at")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) return null;

    const row = data as {
      id: string;
      slug: string;
      status: string;
      domains: string[] | null;
      config: import("@/types/json").JsonObject;
      updated_at: string;
    };

    const merged = normalizeTenantConfig({
      ...row.config,
      id: row.id,
      slug: row.slug,
      status: row.status,
      domains: row.domains ?? [],
      updatedAt: row.updated_at,
    });

    return merged;
  } catch {
    return null;
  }
}

export async function upsertTenantToDatabase(
  config: TenantConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { createAdminServerClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminServerClient();
    const {
      id: _id,
      slug,
      status,
      domains,
      updatedAt,
      ...tenantConfig
    } = config;

    const payload = {
      slug,
      status,
      domains,
      config: asJson(tenantConfig),
      updated_at: updatedAt,
    };

    const { error } = await supabase.from("newsroom_tenants").upsert(payload, {
      onConflict: "slug",
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "upsert_failed",
    };
  }
}
