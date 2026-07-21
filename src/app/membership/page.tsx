import { PageShell } from "@/components/layout/PageShell";
import { MembershipPlansPage } from "@/sections/monetization/MembershipPlansPage";
import { MembershipLandingPage } from "@/features/reader-ds/monetization";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
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

  if (isReaderDesignSystemEnabled()) {
    const paid = payload.plans.find((p) => p.priceInr > 0);
    const fromPriceLabel = paid
      ? `₹${paid.priceInr}/${paid.billingInterval === "year" ? "वर्ष" : "माह"} से सदस्य बनें`
      : "प्लान देखें · सदस्य बनें";
    return <MembershipLandingPage fromPriceLabel={fromPriceLabel} />;
  }

  return (
    <PageShell variant="news">
      <main id="main-content" className="nr-wrap py-10">
        <MembershipPlansPage plans={payload.plans} tenantName={tenant.branding.nameEn} />
      </main>
    </PageShell>
  );
}
