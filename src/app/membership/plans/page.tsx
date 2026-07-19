import { PlanComparisonPage } from "@/features/reader-ds/monetization";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { fetchMonetizationPayload } from "@/lib/monetization/fetch-payload";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { redirect } from "next/navigation";

export async function generateMetadata() {
  const tenant = await getTenantConfig();
  return buildUtilityPageMetadata({
    title: `Plans · ${tenant.branding.nameEn}`,
    description: "Compare membership plans.",
    path: "/membership/plans",
  });
}

export default async function MembershipPlansRoute() {
  if (!isReaderDesignSystemEnabled()) redirect("/membership");
  const tenant = await getTenantConfig();
  const payload = await fetchMonetizationPayload(tenant);
  return <PlanComparisonPage plans={payload.plans} />;
}
