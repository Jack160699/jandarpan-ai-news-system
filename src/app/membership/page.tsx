import { PageShell } from "@/components/layout/PageShell";
import { MembershipPlansPage } from "@/sections/monetization/MembershipPlansPage";
import { buildPageMetadata } from "@/lib/seo";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { fetchMonetizationPayload } from "@/lib/monetization/fetch-payload";

export async function generateMetadata() {
  const tenant = await getTenantConfig();
  return buildPageMetadata({
    title: `Membership · ${tenant.branding.nameEn}`,
    description: "Subscribe for ad-light reading, premium reports, and member newsletters.",
    path: "/membership",
    noindex: true,
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
