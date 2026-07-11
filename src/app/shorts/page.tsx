import type { Metadata } from "next";
import { Suspense } from "react";
import { isReelsV3Enabled } from "@/features/reels-v3/config";
import { ReelsExperienceV3 } from "@/features/reels-v3";
import { ReelsPage } from "@/features/reels/ReelsPage";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchShortsPool } from "@/lib/news/shorts/build-short";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbListJsonLd,
  buildFacetedVariantMetadata,
  buildHubPageMetadata,
  collectionPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";

export const revalidate = 60;

const BASE_TITLE = `News Reels · ${BRAND.nameEn}`;
const BASE_DESCRIPTION =
  "Vertical 60-second news reels from Chhattisgarh and India — swipe to watch, read the full story anytime.";
const BASE_PATH = "/shorts";

type PageProps = {
  searchParams: Promise<{ start?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { start } = await searchParams;

  if (start?.trim()) {
    return buildFacetedVariantMetadata({
      baseTitle: BASE_TITLE,
      description: BASE_DESCRIPTION,
      basePath: BASE_PATH,
    });
  }

  return buildHubPageMetadata({
    title: BASE_TITLE,
    description: BASE_DESCRIPTION,
    path: BASE_PATH,
    keywords: [
      "news reels",
      "short news videos",
      "Chhattisgarh shorts",
      "vertical news",
    ],
  });
}

export default async function ShortsPage() {
  const reelsV3 = isReelsV3Enabled();
  const displayLanguage = await getServerReaderLanguage();
  const shorts = await fetchShortsPool(32, displayLanguage);

  const jsonLd = [
    collectionPageJsonLd({
      name: "News Reels",
      description: BASE_DESCRIPTION,
      path: BASE_PATH,
      items: shorts.slice(0, 12).map((short) => ({
        url: `/story/${short.slug}`,
        name: short.headline,
      })),
    }),
    breadcrumbListJsonLd([
      buildHomeBreadcrumb(),
      { name: "News Reels", href: BASE_PATH },
    ]),
  ];

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <Suspense
        fallback={
          <div className="reels-page reels-page--loading" aria-busy="true">
            <p className="reels-empty">रील्स लोड हो रही हैं…</p>
          </div>
        }
      >
        {reelsV3 ? (
          <ReelsExperienceV3 shorts={shorts} />
        ) : (
          <ReelsPage shorts={shorts} />
        )}
      </Suspense>
    </>
  );
}
