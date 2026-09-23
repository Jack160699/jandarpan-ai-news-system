import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { HomepageLoadingView } from "@/components/loading";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { buildTrendingKeywords, homepageJsonLd } from "@/lib/seo";
import { Footer } from "@/sections/Footer";
import { HomepageEmpty } from "@/sections/homepage";
import { HomepageLiveView } from "@/sections/homepage/HomepageLiveView";

async function HomeFeed() {
  const feed = await getCachedGeneratedHomepageFeed();

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
        <>
          <HomepageEmpty />
          <Footer />
        </>
      )}
    </>
  );
}

export function LegacyHomeView() {
  return (
    <PageShell variant="news">
      <main id="main-content" className="nr-root" role="main">
        <Suspense fallback={<HomepageLoadingView />}>
          <HomeFeed />
        </Suspense>
      </main>
    </PageShell>
  );
}
