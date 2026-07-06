import { BRAND } from "@/lib/brand";
import { PUBLISHER_LOGO_URL, SITE_URL } from "@/lib/seo/constants";
import type { TenantConfig } from "@/lib/tenant/types";
import { buildOrganizationSocialLinks } from "./social";
import type { OrganizationSettings } from "./types";

function absoluteLogo(url: string): string {
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? `${SITE_URL}${url}` : PUBLISHER_LOGO_URL;
}

export function organizationJsonLdFromSettings(
  settings: OrganizationSettings,
  tenant?: TenantConfig
) {
  const name = settings.organizationName.trim() || tenant?.branding.nameEn || BRAND.nameEn;
  const description =
    tenant?.branding.taglineEn ?? BRAND.taglineEn;
  const sameAs = buildOrganizationSocialLinks(settings).map((s) => s.href);

  const addressParts = [
    settings.address,
    settings.city,
    settings.state,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name,
    alternateName: tenant?.branding.nameHi ?? BRAND.nameHi,
    description,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteLogo(settings.logoUrl),
    },
    email: settings.email || undefined,
    telephone: settings.phone || undefined,
    foundingDate: String(BRAND.founded),
    areaServed: {
      "@type": "State",
      name: settings.state || "Chhattisgarh",
      containedInPlace: { "@type": "Country", name: "India" },
    },
    ...(addressParts.length
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: settings.address || undefined,
            addressLocality: settings.city || undefined,
            addressRegion: settings.state || undefined,
            addressCountry: "IN",
          },
        }
      : {}),
    publishingPrinciples: `${SITE_URL}/editorial-policy`,
    correctionsPolicy: `${SITE_URL}/corrections`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: settings.email,
        telephone: settings.phone || undefined,
        availableLanguage: ["en", "hi"],
      },
      {
        "@type": "ContactPoint",
        contactType: "editorial",
        email: settings.editorialEmail,
      },
      {
        "@type": "ContactPoint",
        contactType: "copyright",
        email: settings.copyrightEmail,
      },
    ].filter((c) => c.email),
    sameAs: sameAs.length ? sameAs : [SITE_URL],
  };
}

export function publisherBlockFromSettings(settings: OrganizationSettings) {
  return {
    "@type": "NewsMediaOrganization" as const,
    name: settings.organizationName,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject" as const,
      url: absoluteLogo(settings.logoUrl),
      width: 512,
      height: 512,
    },
    email: settings.email || undefined,
  };
}
