import type { TenantConfig } from "@/lib/tenant/types";

export function TenantJsonLd({ tenant }: { tenant: TenantConfig }) {
  const { branding, siteUrl, seo } = tenant;
  const primaryRegion = tenant.regions.find((r) => r.isPrimary) ?? tenant.regions[0];

  const organization = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: branding.nameEn,
    alternateName: branding.nameHi,
    description: branding.taglineEn,
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: new URL(branding.logoUrl, siteUrl).toString(),
    },
    areaServed: primaryRegion
      ? {
          "@type": "AdministrativeArea",
          name: primaryRegion.name,
        }
      : undefined,
    publishingPrinciples: `${siteUrl}/archive`,
    sameAs: [siteUrl],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: branding.nameEn,
    alternateName: branding.nameHi,
    url: siteUrl,
    description: seo.defaultDescription,
    inLanguage: tenant.newsroom.enabledLanguages.map((l) =>
      l === "en" ? "en-IN" : "hi-IN"
    ),
    publisher: {
      "@type": "NewsMediaOrganization",
      name: branding.nameEn,
      url: siteUrl,
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
