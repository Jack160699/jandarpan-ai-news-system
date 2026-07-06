import type { TenantConfig } from "@/lib/tenant/types";
import { PUBLISHER_LOGO_URL, SITE_URL } from "@/lib/seo/constants";

export function TenantJsonLd({ tenant }: { tenant: TenantConfig }) {
  const { branding, seo } = tenant;
  const primaryRegion = tenant.regions.find((r) => r.isPrimary) ?? tenant.regions[0];

  const organization = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: branding.nameEn,
    alternateName: branding.nameHi,
    description: branding.taglineEn,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: branding.logoUrl.startsWith("http")
        ? branding.logoUrl
        : PUBLISHER_LOGO_URL,
    },
    areaServed: primaryRegion
      ? {
          "@type": "AdministrativeArea",
          name: primaryRegion.name,
        }
      : undefined,
    publishingPrinciples: `${SITE_URL}/archive`,
    sameAs: [SITE_URL],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: branding.nameEn,
    alternateName: branding.nameHi,
    url: SITE_URL,
    description: seo.defaultDescription,
    inLanguage: tenant.newsroom.enabledLanguages.map((l) =>
      l === "en" ? "en-IN" : "hi-IN"
    ),
    publisher: {
      "@type": "NewsMediaOrganization",
      name: branding.nameEn,
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
