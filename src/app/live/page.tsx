import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbListJsonLd,
  buildHubPageMetadata,
  collectionPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";
import { Footer } from "@/sections/Footer";
import { HomepageEmpty } from "@/sections/homepage";
import { LiveDeskLiveView } from "@/sections/live/LiveDeskLiveView";

export const revalidate = 60;

const BASE_TITLE = `Live Desk · ${BRAND.nameEn}`;
const BASE_DESCRIPTION =
  "Breaking and live wire updates from Chhattisgarh — developing stories as they happen.";
const BASE_PATH = "/live";

export const metadata = buildHubPageMetadata({
  title: BASE_TITLE,
  description: BASE_DESCRIPTION,
  path: BASE_PATH,
  keywords: [
    "live news",
    "breaking news",
    "Chhattisgarh live wire",
    "developing stories",
    "Jan Darpan live desk",
  ],
});

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

  const liveArticles = [...feed.breakingTicker, ...feed.liveWire].slice(0, 20);
  const jsonLd = [
    collectionPageJsonLd({
      name: "Live Desk",
      description: BASE_DESCRIPTION,
      path: BASE_PATH,
      items: liveArticles.map((article) => ({
        url: `/story/${article.slug}`,
        name: article.headline,
      })),
    }),
    breadcrumbListJsonLd([
      buildHomeBreadcrumb(),
      { name: "Live Desk", href: BASE_PATH },
    ]),
  ];

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
