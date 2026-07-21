import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FUEL_CITY_SLUGS, isFuelCitySlug, resolveFuelSlug } from "@/lib/verified-rates/catalog";
import {
  RateDetailPage,
  buildRateMetadata,
} from "@/features/reader-ds/utilities/RateDetailPage";

type Params = { city: string; slug: string };

export function generateStaticParams() {
  return FUEL_CITY_SLUGS.flatMap((city) => [
    { city, slug: "petrol-price-today" },
    { city, slug: "diesel-price-today" },
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { city, slug } = await params;
  if (!isFuelCitySlug(city)) return {};
  const category = resolveFuelSlug(slug);
  if (!category) return {};
  return buildRateMetadata({
    category,
    citySlug: city,
    path: `/rates/chhattisgarh/${city}/${slug}`,
  });
}

export default async function FuelRatePage({ params }: { params: Promise<Params> }) {
  const { city, slug } = await params;
  if (!isFuelCitySlug(city)) notFound();
  const category = resolveFuelSlug(slug);
  if (!category) notFound();

  return (
    <RateDetailPage
      category={category}
      citySlug={city}
      path={`/rates/chhattisgarh/${city}/${slug}`}
    />
  );
}
