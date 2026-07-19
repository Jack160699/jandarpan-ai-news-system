import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { HomepageLoadingView } from "@/components/loading";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { ReaderHomepage } from "@/features/reader-ds/homepage/ReaderHomepage";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { buildHomeMetadata, buildTrendingKeywords, homepageJsonLd } from "@/lib/seo";
import { Footer } from "@/sections/Footer";
import { HomepageEmpty } from "@/sections/homepage";
import { HomepageLiveView } from "@/sections/homepage/HomepageLiveView";

export const metadata = buildHomeMetadata();

/** ISR — edge-friendly cache, 60s freshness */
export const revalidate = 60;

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

/** Approved navy/red/gold reader design (flag-gated, preview only). */
async function ReaderDesignFeed() {
  const feed = await getCachedGeneratedHomepageFeed();
  const trending = buildTrendingKeywords({ limit: 12 });
  const storyCount = feed ? feed.trending.length + feed.liveWire.length + 1 : 0;

  return (
    <>
      <JsonLdScript data={homepageJsonLd({ storyCount, trendingKeywords: trending })} />
      {feed ? (
        <ReaderHomepage feed={feed} />
      ) : (
        <>
          <HomepageEmpty />
          <Footer />
        </>
      )}
    </>
  );
}

export default function Home() {
  if (isReaderDesignSystemEnabled()) {
    return (
      <Suspense fallback={<HomepageLoadingView />}>
        <ReaderDesignFeed />
      </Suspense>
    );
  }

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
