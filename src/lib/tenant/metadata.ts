import type { Metadata } from "next";
import { PRODUCTION_ROBOTS } from "@/lib/seo/constants";
import type { TenantConfig } from "@/lib/tenant/types";
import { tenantThemeColor } from "@/lib/tenant/theme";

export function buildTenantSiteMetadata(tenant: TenantConfig): Metadata {
  const { branding, seo, siteUrl } = tenant;
  const titleDefault = `${branding.nameHi} — ${seo.titleSuffix}`;
  const ogImage =
    tenant.branding.logoUrl?.includes("hamar") ||
    tenant.slug === "hamar-chhattisgarh" ||
    tenant.slug === "cg-bhaskar"
      ? "/brand/hamar-chhattisgarh-og.svg"
      : tenant.branding.logoMarkUrl ?? tenant.branding.logoUrl ?? "/brand/hamar-chhattisgarh-og.svg";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: titleDefault,
      template: `%s · ${branding.nameHi}`,
    },
    description: seo.defaultDescription,
    applicationName: branding.nameHi,
    category: "news",
    keywords: seo.keywords,
    manifest: "/site.webmanifest",
    icons: branding.faviconUrl
      ? {
          icon: branding.faviconUrl,
          apple: branding.logoMarkUrl ?? branding.faviconUrl,
        }
      : undefined,
    appleWebApp: {
      capable: true,
      title: branding.nameHi,
      statusBarStyle: "default",
    },
    openGraph: {
      title: titleDefault,
      description: branding.taglineHi,
      type: "website",
      url: siteUrl,
      locale: seo.locale,
      siteName: branding.nameHi,
      images: [{ url: ogImage, width: 1200, height: 630, alt: branding.nameHi }],
    },
    twitter: {
      card: "summary_large_image",
      title: branding.nameHi,
      description: branding.taglineHi,
      images: [ogImage],
    },
    robots: PRODUCTION_ROBOTS,
  };
}

export function buildTenantViewport(tenant: TenantConfig) {
  return {
    themeColor: tenantThemeColor(tenant, "light"),
  };
}
