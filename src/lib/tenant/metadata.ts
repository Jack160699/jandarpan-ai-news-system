import type { Metadata } from "next";
import { PRODUCTION_ROBOTS } from "@/lib/seo/constants";
import type { TenantConfig } from "@/lib/tenant/types";
import { tenantThemeColor } from "@/lib/tenant/theme";

export function buildTenantSiteMetadata(tenant: TenantConfig): Metadata {
  const { branding, seo, siteUrl } = tenant;
  const titleDefault = `${branding.nameEn} — ${seo.titleSuffix}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: titleDefault,
      template: `%s · ${branding.nameEn}`,
    },
    description: seo.defaultDescription,
    applicationName: branding.nameEn,
    category: "news",
    keywords: seo.keywords,
    icons: branding.faviconUrl
      ? { icon: branding.faviconUrl }
      : undefined,
    openGraph: {
      title: titleDefault,
      description: branding.taglineEn,
      type: "website",
      url: siteUrl,
      locale: seo.locale,
      siteName: branding.nameEn,
    },
    twitter: {
      card: "summary_large_image",
      title: branding.nameEn,
      description: branding.taglineEn,
    },
    robots: PRODUCTION_ROBOTS,
  };
}

export function buildTenantViewport(tenant: TenantConfig) {
  return {
    themeColor: tenantThemeColor(tenant, "light"),
  };
}
