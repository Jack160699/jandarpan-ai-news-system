import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DistrictHubView } from "@/components/newsroom-platform/DistrictHubView";
import {
  getPlatformDistrict,
  loadPlatformDistricts,
} from "@/lib/newsroom-platform/config/districts";

export const revalidate = 120;

type PageProps = { params: Promise<{ district: string }> };

export async function generateStaticParams() {
  const districts = await loadPlatformDistricts();
  return districts.map((d) => ({ district: d.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { district } = await params;
  const meta = await getPlatformDistrict(district);
  if (!meta) return { title: "District" };
  return {
    title: `${meta.nameEn} News | Jan Darpan`,
    description: `Latest news from ${meta.nameEn}, Chhattisgarh.`,
  };
}

export default async function DistrictsPage({ params }: PageProps) {
  const { district } = await params;
  if (!(await getPlatformDistrict(district))) notFound();
  return <DistrictHubView district={district} />;
}
