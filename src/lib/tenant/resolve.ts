import { cache } from "react";
import { headers, cookies } from "next/headers";
import {
  getDefaultTenant,
  getTenantByDomain,
  getTenantBySlug,
  loadTenantFromDatabase,
} from "@/lib/tenant/registry";
import { logWhitelabelAnalytics } from "@/lib/tenant/analytics";
import type { TenantConfig, TenantPublicConfig } from "@/lib/tenant/types";

export const TENANT_HEADER = "x-tenant-slug";
export const TENANT_COOKIE = "nr-tenant-slug";

export async function resolveTenantSlugFromRequest(): Promise<string> {
  const headerStore = await headers();
  const fromHeader = headerStore.get(TENANT_HEADER);
  if (fromHeader) return fromHeader;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(TENANT_COOKIE)?.value;
  if (fromCookie) return fromCookie;

  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "";

  const byDomain = getTenantByDomain(host);
  if (byDomain) return byDomain.slug;

  return getDefaultTenant().slug;
}

export const getTenantConfig = cache(async (): Promise<TenantConfig> => {
  const slug = await resolveTenantSlugFromRequest();

  const dbTenant = await loadTenantFromDatabase(slug);
  if (dbTenant) {
    logWhitelabelAnalytics({
      event: "tenant_resolved",
      source: "database",
      slug,
    });
    return dbTenant;
  }

  const staticTenant = getTenantBySlug(slug);
  if (staticTenant) {
    logWhitelabelAnalytics({
      event: "tenant_resolved",
      source: "static",
      slug,
    });
    return staticTenant;
  }

  logWhitelabelAnalytics({
    event: "tenant_fallback",
    slug,
    fallback: getDefaultTenant().slug,
  });

  return getDefaultTenant();
});

/**
 * Strip RegExp matchers before passing tenant into Client Components.
 * Matchers are server-only (ranking / section inference); nav uses slug/href only.
 */
export function stripTenantForClient(tenant: TenantConfig): TenantConfig {
  return {
    ...tenant,
    categories: tenant.categories.map((category) => ({
      ...category,
      matchers: [],
    })),
  };
}

export function toPublicTenantConfig(tenant: TenantConfig): TenantPublicConfig {
  return {
    slug: tenant.slug,
    branding: {
      nameEn: tenant.branding.nameEn,
      nameHi: tenant.branding.nameHi,
      taglineEn: tenant.branding.taglineEn,
      taglineHi: tenant.branding.taglineHi,
      logoUrl: tenant.branding.logoUrl,
      logoMarkUrl: tenant.branding.logoMarkUrl,
    },
    theme: tenant.theme,
    typography: tenant.typography,
    categories: tenant.categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      label: c.label,
      labelHi: c.labelHi,
      href: c.href,
    })),
    regions: tenant.regions.map((r) => ({
      slug: r.slug,
      name: r.name,
      nameHi: r.nameHi,
    })),
    newsroom: {
      defaultLanguage: tenant.newsroom.defaultLanguage,
      enabledLanguages: tenant.newsroom.enabledLanguages,
      primaryRegionSlug: tenant.newsroom.primaryRegionSlug,
    },
  };
}
