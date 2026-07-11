import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { fetchShortsPool } from "@/lib/news/shorts/build-short";
import { BRAND } from "@/lib/brand";
import {
  buildFacetedVariantMetadata,
  buildHubPageMetadata,
  breadcrumbListJsonLd,
  collectionPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";
import { AudioPageClient } from "@/features/audio/AudioPageClient";
import { isAudioV3Enabled } from "@/features/audio/config";
import { Footer } from "@/sections/Footer";
import { ListenPageClient } from "@/sections/listen/ListenPageClient";

export const revalidate = 60;

const BASE_TITLE = `Listen to Today's Headlines · ${BRAND.nameEn}`;
const BASE_DESCRIPTION =
  "Hear today's top headlines in Hindi — audio briefing from Jan Darpan Chhattisgarh.";
const BASE_PATH = "/listen";

type ListenPageProps = {
  searchParams: Promise<{ play?: string }>;
};

export async function generateMetadata({
  searchParams,
}: ListenPageProps): Promise<Metadata> {
  const { play } = await searchParams;

  if (play?.trim()) {
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
      "audio news",
      "listen headlines",
      "Hindi news briefing",
      "Chhattisgarh audio news",
    ],
  });
}

export default async function ListenPage({ searchParams }: ListenPageProps) {
  const params = await searchParams;
  const displayLanguage = await getServerReaderLanguage();
  const homepageFeed = await getCachedGeneratedHomepageFeed();
  const reservedIds = homepageFeed
    ? new Set([
        homepageFeed.editorsPicks.lead.id,
        ...homepageFeed.breakingTicker.map((a) => a.id),
        ...homepageFeed.trending.map((a) => a.id),
        ...homepageFeed.liveWire.map((a) => a.id),
        ...homepageFeed.regionalHighlights.map((a) => a.id),
        ...homepageFeed.shorts.map((a) => a.id),
      ])
    : undefined;

  const shorts = await fetchShortsPool(20, displayLanguage, {
    preferredArticleIds: homepageFeed?.listenArticleIds,
    reservedIds,
    maxHomepageOverlap: 2,
  });
  const autoPlay = params.play === "1";
  const audioV3 = isAudioV3Enabled();

  const jsonLd = [
    collectionPageJsonLd({
      name: "Listen to Today's Headlines",
      description: BASE_DESCRIPTION,
      path: BASE_PATH,
      items: shorts.slice(0, 20).map((short) => ({
        url: `/story/${short.slug}`,
        name: short.headline,
      })),
    }),
    breadcrumbListJsonLd([
      buildHomeBreadcrumb(),
      { name: "Listen", href: BASE_PATH },
    ]),
  ];

  return (
    <PageShell variant="news">
      <JsonLdScript data={jsonLd} />
      <main
        id="main-content"
        className={audioV3 ? "audio-v3-page-root nr-root" : "listen-page-root nr-root"}
        role="main"
      >
        {audioV3 ? (
          <AudioPageClient shorts={shorts} autoPlay={autoPlay} />
        ) : (
          <ListenPageClient shorts={shorts} autoPlay={autoPlay} />
        )}
      </main>
      <Footer />
    </PageShell>
  );
}
