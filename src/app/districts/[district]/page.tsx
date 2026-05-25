import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DistrictHubView } from "@/components/newsroom-platform/DistrictHubView";
import {
  getPlatformDistrict,
  PLATFORM_DISTRICT_SLUGS,
} from "@/lib/newsroom-platform/config/districts";
/** District hub ISR — keep in sync with `ISR.district` in config/isr.ts */
export const revalidate = 120;

type PageProps = { params: Promise<{ district: string }> };

export function generateStaticParams() {
  return PLATFORM_DISTRICT_SLUGS.map((district) => ({ district }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { district } = await params;
  const meta = getPlatformDistrict(district);
  if (!meta) return { title: "District" };
  return {
    title: `${meta.nameEn} News | Jan Darpan`,
    description: `Latest news from ${meta.nameEn}, Chhattisgarh.`,
  };
}

export default async function DistrictsPage({ params }: PageProps) {
  const { district } = await params;
  if (!getPlatformDistrict(district)) notFound();
  return <DistrictHubView district={district} />;
}
