import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { DistrictSelectorPage } from "@/features/reader-ds/pages";
import { getServerHomeDistrict } from "@/lib/personalization/server-prefs";
import { CG_DISTRICTS, getPrioritizedDistricts } from "@/lib/regional";
import { buildHubPageMetadata } from "@/lib/seo";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<{ select?: string }>;
};

export const metadata: Metadata = buildHubPageMetadata({
  title: "Choose District · Jan Darpan",
  description: "Select your Chhattisgarh district for personalized local news.",
  path: "/district",
  keywords: ["Chhattisgarh districts", "hyperlocal news", "ज़िला"],
  locale: "hi_IN",
});

export default async function DistrictIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const home = (await getServerHomeDistrict()) || "raipur";

  if (!isReaderDesignSystemEnabled()) {
    redirect(`/district/${home}`);
  }

  if (params.select === "1") {
    const districts = getPrioritizedDistricts().map((d) => ({
      slug: d.slug,
      name: d.name,
      nameHi: d.nameHi,
    }));
    // Fallback if helper returns empty
    const list =
      districts.length > 0
        ? districts
        : CG_DISTRICTS.map((d) => ({ slug: d.slug, name: d.name, nameHi: d.nameHi }));

    return <DistrictSelectorPage districts={list} selectedSlug={home} />;
  }

  redirect(`/district/${home}`);
}
