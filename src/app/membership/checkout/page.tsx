import { CheckoutPage } from "@/features/reader-ds/monetization";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { fetchMonetizationPayload } from "@/lib/monetization/fetch-payload";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: "Checkout",
  description: "Membership checkout.",
  path: "/membership/checkout",
});

type Props = { searchParams: Promise<{ plan?: string; interval?: string }> };

export default async function MembershipCheckoutRoute({ searchParams }: Props) {
  if (!isReaderDesignSystemEnabled()) redirect("/membership");
  const { plan, interval } = await searchParams;
  const tenant = await getTenantConfig();
  const payload = await fetchMonetizationPayload(tenant);
  return (
    <CheckoutPage plans={payload.plans} planSlug={plan} interval={interval} />
  );
}
