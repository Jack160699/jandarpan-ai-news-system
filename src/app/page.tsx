import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { HomepageLoadingView } from "@/components/loading";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { buildHomeMetadata, buildTrendingKeywords, homepageJsonLd } from "@/lib/seo";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { Footer } from "@/sections/Footer";
import { HomepageEmpty } from "@/sections/homepage";
import { HomepageLiveView } from "@/sections/homepage/HomepageLiveView";

export const metadata = buildHomeMetadata();

/** ISR — edge-friendly cache, 60s freshness */
export const revalidate = 60;

async function HomeFeed() {
  const [feed, tenant] = await Promise.all([
    getCachedGeneratedHomepageFeed(),
    getTenantConfig(),
  ]);

  const trending = buildTrendingKeywords({ limit: 12 });
  const storyCount = feed
    ? feed.trending.length + feed.liveWire.length + 1
    : 0;

  return (
    <>
      <JsonLdScript
        data={homepageJsonLd({
          storyCount,
          trendingKeywords: trending,
        })}
      />
      {feed ? (
        <HomepageLiveView feed={feed} />
      ) : (
        <HomepageEmpty />
      )}
    </>
  );
}

export default function Home() {
  return (
    <PageShell variant="news">
      <main id="main-content" className="nr-root relative z-[2]" role="main">
        <Suspense fallback={<HomepageLoadingView />}>
          <HomeFeed />
        </Suspense>
        <Footer />
      </main>
    </PageShell>
  );
}
