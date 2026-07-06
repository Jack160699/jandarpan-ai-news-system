import { NEWSROOM_LANGUAGES, type NewsroomLanguage } from "@/lib/i18n/languages";
import { defaultMonetizationSettings } from "@/lib/monetization/placements";
import { resolveCanonicalSiteUrl } from "@/lib/seo/canonical-url";
import { getDefaultTenant } from "@/lib/tenant/registry";
import type { TenantConfig } from "@/lib/tenant/types";
import type { TenantMonetizationSettings } from "@/lib/monetization/types";

function resolveTenantSiteUrl(value: string): string {
  const trimmed = value.replace(/\/$/, "");
  if (
    trimmed.includes("vercel.app") ||
    trimmed.includes("localhost") ||
    trimmed.includes("127.0.0.1")
  ) {
    return resolveCanonicalSiteUrl();
  }
  return trimmed;
}

export function normalizeTenantConfig(
  partial: Record<string, unknown>
): TenantConfig {
  const base = getDefaultTenant();
  const branding = {
    ...base.branding,
    ...(partial.branding as object),
  };
  const theme = { ...base.theme, ...(partial.theme as object) };
  const typography = {
    ...base.typography,
    ...(partial.typography as object),
  };
  const newsroom = {
    ...base.newsroom,
    ...(partial.newsroom as object),
  };
  const seo = { ...base.seo, ...(partial.seo as object) };
  const monetization = {
    ...defaultMonetizationSettings(),
    ...(base.monetization ?? {}),
    ...(partial.monetization as Partial<TenantMonetizationSettings>),
  };

  const enabled = (newsroom.enabledLanguages as NewsroomLanguage[] | undefined)?.filter(
    (l) => NEWSROOM_LANGUAGES.includes(l)
  );

  return {
    ...base,
    ...partial,
    version: 1,
    id: String(partial.id ?? base.id),
    slug: String(partial.slug ?? base.slug),
    status: (partial.status as TenantConfig["status"]) ?? base.status,
    domains: Array.isArray(partial.domains)
      ? (partial.domains as string[])
      : base.domains,
    siteUrl: resolveTenantSiteUrl(String(partial.siteUrl ?? base.siteUrl)),
    branding,
    theme,
    typography,
    categories: Array.isArray(partial.categories)
      ? (partial.categories as TenantConfig["categories"])
      : base.categories,
    regions: Array.isArray(partial.regions)
      ? (partial.regions as TenantConfig["regions"])
      : base.regions,
    newsroom: {
      ...newsroom,
      enabledLanguages: enabled?.length
        ? enabled
        : base.newsroom.enabledLanguages,
    },
    seo,
    monetization,
    updatedAt: String(partial.updatedAt ?? new Date().toISOString()),
  } as TenantConfig;
}
