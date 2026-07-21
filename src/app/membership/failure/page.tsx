import { PaymentFailurePage } from "@/features/reader-ds/monetization";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: "Payment unsuccessful",
  description: "Payment could not be completed.",
  path: "/membership/failure",
});

type Props = {
  searchParams: Promise<{ reason?: string; plan?: string }>;
};

export default async function MembershipFailureRoute({ searchParams }: Props) {
  if (!isReaderDesignSystemEnabled()) redirect("/membership");
  const { reason, plan } = await searchParams;
  return <PaymentFailurePage reason={reason} planSlug={plan} />;
}
