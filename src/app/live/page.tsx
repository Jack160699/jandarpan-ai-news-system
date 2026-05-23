import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { BRAND } from "@/lib/brand";
import { PRODUCTION_ROBOTS, SITE_URL, webPageJsonLd } from "@/lib/seo";
import { Footer } from "@/sections/Footer";
import { HomepageEmpty } from "@/sections/homepage";
import { LiveDeskLiveView } from "@/sections/live/LiveDeskLiveView";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Live Desk · ${BRAND.nameEn}`,
  description:
    "Breaking and live wire updates from Chhattisgarh — developing stories as they happen.",
  alternates: { canonical: `${SITE_URL}/live` },
  robots: PRODUCTION_ROBOTS,
};

export default async function LivePage() {
  const feed = await getCachedGeneratedHomepageFeed();

  if (!feed) {
    return (
      <PageShell variant="news">
        <main id="main-content" role="main">
          <HomepageEmpty />
        </main>
        <Footer />
      </PageShell>
    );
  }

  const jsonLd = webPageJsonLd(
    "Live Desk",
    "Live breaking wire from Jan Darpan Chhattisgarh.",
    "/live"
  );

  return (
    <PageShell variant="news">
      <JsonLdScript data={jsonLd} />
      <main id="main-content" className="live-page nr-root" role="main">
        <LiveDeskLiveView feed={feed} />
      </main>
      <Footer />
    </PageShell>
  );
}
