import { PageShell } from "@/components/layout/PageShell";
import { MembershipPlansPage } from "@/sections/monetization/MembershipPlansPage";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { fetchMonetizationPayload } from "@/lib/monetization/fetch-payload";

export async function generateMetadata() {
  const tenant = await getTenantConfig();
  return buildUtilityPageMetadata({
    title: `Membership · ${tenant.branding.nameEn}`,
    description:
      "Subscribe for ad-light reading, premium reports, and member newsletters.",
    path: "/membership",
  });
}

export default async function MembershipPage() {
  const tenant = await getTenantConfig();
  const payload = await fetchMonetizationPayload(tenant);

  return (
    <PageShell variant="news">
      <main id="main-content" className="nr-wrap py-10">
        <MembershipPlansPage plans={payload.plans} tenantName={tenant.branding.nameEn} />
      </main>
    </PageShell>
  );
}
