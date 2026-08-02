import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { HomepageLoadingView } from "@/components/loading";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { Masthead, ReaderShell } from "@/features/reader-ds/components";
import { ReaderHomepage } from "@/features/reader-ds/homepage/ReaderHomepage";
import { EmptyState } from "@/features/reader-ds/system";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchMonetizationPayload } from "@/lib/monetization/fetch-payload";
import { buildHomeMetadata, buildTrendingKeywords, homepageJsonLd } from "@/lib/seo";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { isVerifiedRatesPublicNavEnabled } from "@/lib/verified-rates/public-gate";
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
  // Parallel independent fetches — do not serialize feed behind tenant/rates.
  const [feed, tenant, verifiedRatesNavEnabled, readerLanguage] = await Promise.all([
    getCachedGeneratedHomepageFeed(),
    getTenantConfig(),
    isVerifiedRatesPublicNavEnabled(),
    getServerReaderLanguage(),
  ]);
  const monetization = await fetchMonetizationPayload(tenant);
  const adsEnabled = monetization.settings.enabled && monetization.settings.adsEnabled;
  // No demo/native brand creatives — only real placement payloads when wired.
  const nativeAd = null;
  const trending = buildTrendingKeywords({ limit: 12 });
  const storyCount = feed ? feed.trending.length + feed.liveWire.length + 1 : 0;

  return (
    <>
      <JsonLdScript data={homepageJsonLd({ storyCount, trendingKeywords: trending })} />
      {feed ? (
        <ReaderHomepage
          feed={feed}
          nativeAd={nativeAd}
          adsEnabled={adsEnabled}
          verifiedRatesNavEnabled={verifiedRatesNavEnabled}
        />
      ) : (
        <ReaderShell activeNav="home">
          <Masthead />
          <EmptyState
            title={
              readerLanguage === "hi"
                ? "अभी कोई ताज़ा खबर उपलब्ध नहीं है"
                : "No fresh stories are available right now"
            }
            body={
              readerLanguage === "hi"
                ? "हम पुरानी खबर को ताज़ा बताकर नहीं दिखाते। नई सत्यापित खबर प्रकाशित होते ही यहाँ दिखाई देगी।"
                : "We do not present old reports as current news. New verified stories will appear here as soon as they are published."
            }
            primaryLabel={readerLanguage === "hi" ? "जिले देखें" : "Browse districts"}
            primaryHref="/district"
          />
        </ReaderShell>
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
