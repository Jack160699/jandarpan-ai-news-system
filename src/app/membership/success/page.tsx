import { PaymentSuccessPage } from "@/features/reader-ds/monetization";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: "Membership confirmed",
  description: "Your membership is active.",
  path: "/membership/success",
});

type Props = {
  searchParams: Promise<{ plan?: string; order?: string; until?: string }>;
};

export default async function MembershipSuccessRoute({ searchParams }: Props) {
  if (!isReaderDesignSystemEnabled()) redirect("/membership");
  const { plan, order, until } = await searchParams;
  return (
    <PaymentSuccessPage
      planLabel={plan ?? null}
      orderId={order ?? null}
      validUntil={until ?? null}
    />
  );
}
