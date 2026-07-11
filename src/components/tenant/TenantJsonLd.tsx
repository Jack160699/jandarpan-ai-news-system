import type { TenantConfig } from "@/lib/tenant/types";
import { organizationJsonLdFromSettings } from "@/lib/organization/json-ld";
import type { OrganizationSettings } from "@/lib/organization/types";
import { SITE_URL } from "@/lib/seo/constants";

export function TenantJsonLd({
  tenant,
  organization,
}: {
  tenant: TenantConfig;
  organization: OrganizationSettings;
}) {
  const { branding, seo } = tenant;
  const organizationLd = organizationJsonLdFromSettings(organization, tenant);

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: organization.organizationName || branding.nameEn,
    alternateName: branding.nameHi,
    url: SITE_URL,
    description: seo.defaultDescription,
    inLanguage: tenant.newsroom.enabledLanguages.map((l) =>
      l === "en" ? "en-IN" : "hi-IN"
    ),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: organization.organizationName || branding.nameEn,
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
