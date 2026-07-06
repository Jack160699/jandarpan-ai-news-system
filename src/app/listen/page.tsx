import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { fetchShortsPool } from "@/lib/news/shorts/build-short";
import { BRAND } from "@/lib/brand";
import { PRODUCTION_ROBOTS, SITE_URL, webPageJsonLd } from "@/lib/seo";
import { Footer } from "@/sections/Footer";
import { ListenPageClient } from "@/sections/listen/ListenPageClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Listen to Today's Headlines · ${BRAND.nameEn}`,
  description:
    "Hear today's top headlines in Hindi — audio briefing from Jan Darpan Chhattisgarh.",
  alternates: { canonical: `${SITE_URL}/listen` },
  robots: PRODUCTION_ROBOTS,
};

type ListenPageProps = {
  searchParams: Promise<{ play?: string }>;
};

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

  const jsonLd = webPageJsonLd(
    "Listen to Today's Headlines",
    "Audio news briefing in Hindi from Chhattisgarh.",
    "/listen"
  );

  return (
    <PageShell variant="news">
      <JsonLdScript data={jsonLd} />
      <main id="main-content" className="listen-page-root nr-root" role="main">
        <ListenPageClient shorts={shorts} autoPlay={autoPlay} />
      </main>
      <Footer />
    </PageShell>
  );
}
