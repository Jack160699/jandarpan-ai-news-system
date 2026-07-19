import { PremiumPaywallPage } from "@/features/reader-ds/monetization";
import { isReaderDesignSystemQaEnabled } from "@/features/reader-ds/config";
import { fetchMonetizationPayload } from "@/lib/monetization/fetch-payload";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: "Premium gate preview",
  description: "Paywall preview for design QA.",
  path: "/membership/paywall-preview",
});

/**
 * Design-QA entry for E38 when a dedicated /premium/[slug] row may be missing.
 * Uses the first real premium_reports teaser when available — never invents a news story.
 */
export default async function PaywallPreviewRoute() {
  if (!isReaderDesignSystemQaEnabled()) redirect("/membership");
  const tenant = await getTenantConfig();
  const payload = await fetchMonetizationPayload(tenant);
  const report = payload.premiumReports.find((r) => r.isPaywalled) ?? payload.premiumReports[0];

  if (report) {
    redirect(`/premium/${report.slug}`);
  }

  return (
    <PremiumPaywallPage
      report={{
        slug: "preview",
        title: "प्रीमियम सामग्री",
        excerpt: "पूर्ण विश्लेषण सदस्य पाठकों के लिए उपलब्ध है।",
        price_inr: null,
      }}
    />
  );
}
