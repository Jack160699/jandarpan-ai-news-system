import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd } from "@/lib/seo/breadcrumbs";
import { webPageJsonLd } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/seo/constants";
import {
  cityDisplay,
  getCategoryMeta,
  listSupportedRateRoutes,
  type PublicRateRoute,
} from "@/lib/verified-rates/catalog";
import type { FuelCitySlug, RateCategory } from "@/lib/verified-rates/types";
import { isFuelCitySlug } from "@/lib/verified-rates/catalog";

export function ratePageMetadata(opts: {
  category: RateCategory;
  citySlug?: string | null;
  path: string;
  /** Empty detail pages must pass true until accepted snapshots exist. */
  noindex?: boolean;
}) {
  const meta = getCategoryMeta(opts.category);
  const cityHi =
    opts.citySlug && isFuelCitySlug(opts.citySlug)
      ? cityDisplay(opts.citySlug, "hi")
      : "छत्तीसगढ़";

  const title = opts.noindex
    ? meta.group === "fuel"
      ? `${cityHi} ${meta.labelHi} भाव इतिहास — सत्यापन के बाद उपलब्ध | जन दर्पण`
      : `छत्तीसगढ़ ${meta.labelHi} संकेतात्मक इतिहास — सत्यापन के बाद उपलब्ध | जन दर्पण`
    : meta.group === "fuel"
      ? `${cityHi} ${meta.labelHi} की कीमत आज – 7 दिन का भाव और इतिहास | जन दर्पण`
      : `छत्तीसगढ़ ${meta.labelHi} कीमत आज – संकेतात्मक इतिहास | जन दर्पण`;

  const description = opts.noindex
    ? meta.group === "fuel"
      ? `${cityHi} ${meta.labelHi} की सत्यापित कीमत अभी प्रकाशित नहीं। जन दर्पण केवल सहमति-प्राप्त वास्तविक अवलोकन प्रकाशित करता है — काल्पनिक भाव नहीं।`
      : `छत्तीसगढ़/भारत संकेतात्मक ${meta.labelHi} बेंचमार्क अभी सत्यापित श्रृंखला के बिना प्रकाशित नहीं। शहर-विशेष आधिकारिक MRP नहीं।`
    : meta.group === "fuel"
      ? `आज ${cityHi} में ${meta.labelHi} की सत्यापित कीमत, ${meta.unitLabelHi} दर, अपडेट समय, पिछले दिनों का ग्राफ और हाल का बदलाव देखें।`
      : `छत्तीसगढ़/भारत संकेतात्मक ${meta.labelHi} बेंचमार्क, ${meta.unitLabelHi}, सत्यापन समय और उपलब्ध ऐतिहासिक श्रृंखला। शहर-विशेष आधिकारिक MRP नहीं।`;

  return buildPageMetadata({
    title,
    description,
    path: opts.path,
    locale: "hi_IN",
    section: "rates",
    keywords: [meta.labelHi, cityHi, "छत्तीसगढ़", "जन दर्पण", "सत्यापित दर"],
    noindex: opts.noindex === true,
  });
}

export function rateBreadcrumbs(opts: {
  category: RateCategory;
  citySlug?: string | null;
  path: string;
}) {
  const meta = getCategoryMeta(opts.category);
  const items = [
    { name: "होम", href: "/" },
    { name: "दरें", href: "/rates" },
    { name: "छत्तीसगढ़", href: "/rates/chhattisgarh" },
  ];
  if (opts.citySlug && isFuelCitySlug(opts.citySlug)) {
    items.push({
      name: cityDisplay(opts.citySlug, "hi"),
      href: `/rates/chhattisgarh/${opts.citySlug}/${meta.slug}`,
    });
  } else {
    items.push({ name: meta.labelHi, href: opts.path });
  }
  return breadcrumbListJsonLd(items);
}

export function rateWebPageJsonLd(opts: {
  title: string;
  description: string;
  path: string;
}) {
  return webPageJsonLd(opts.title, opts.description, opts.path);
}

export function rateDatasetJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  availableFrom: string | null;
  availableTo: string | null;
  variable: string;
  unit: string;
  distributionUrl?: string | null;
  eligible: boolean;
}) {
  if (!opts.eligible || !opts.availableFrom || !opts.availableTo) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    creator: {
      "@type": "NewsMediaOrganization",
      name: "जन दर्पण",
      url: SITE_URL,
    },
    temporalCoverage: `${opts.availableFrom}/${opts.availableTo}`,
    spatialCoverage: {
      "@type": "State",
      name: "Chhattisgarh",
      containedInPlace: { "@type": "Country", name: "India" },
    },
    variableMeasured: opts.variable,
    measurementTechnique: "Jan Darpan verified consensus snapshots",
    license: `${SITE_URL}/rates/methodology`,
    distribution: opts.distributionUrl
      ? [
          {
            "@type": "DataDownload",
            encodingFormat: "text/csv",
            contentUrl: opts.distributionUrl,
          },
        ]
      : undefined,
  };
}

export function buildRatesSitemapEntries(): PublicRateRoute[] {
  return listSupportedRateRoutes().filter((r) => r.indexable);
}

export function ratesSitemapLastmod(
  path: string,
  latestByPath: Map<string, Date>,
  contentEpoch: Date
): Date {
  return latestByPath.get(path) ?? contentEpoch;
}

export function fuelCityPath(city: FuelCitySlug, category: "petrol" | "diesel"): string {
  const slug = getCategoryMeta(category).slug;
  return `/rates/chhattisgarh/${city}/${slug}`;
}
