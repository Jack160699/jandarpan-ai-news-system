import { ManageSubscriptionPage } from "@/features/reader-ds/monetization";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: "Manage membership",
  description: "Manage your Jan Darpan membership.",
  path: "/membership/manage",
});

export default function MembershipManageRoute() {
  if (!isReaderDesignSystemEnabled()) redirect("/membership");
  return <ManageSubscriptionPage />;
}
