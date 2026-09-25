import dynamic from "next/dynamic";
import { Suspense } from "react";
import { HomepageLoadingView } from "@/components/loading";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { Masthead, ReaderShell } from "@/features/reader-ds/components";
import { ReaderHomepage } from "@/features/reader-ds/homepage/ReaderHomepage";
import { EmptyState } from "@/features/reader-ds/system";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { pruneFeedForReader } from "@/lib/homepage/prune-reader-feed";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchMonetizationPayload } from "@/lib/monetization/fetch-payload";
import { buildHomeMetadata, buildTrendingKeywords, homepageJsonLd } from "@/lib/seo";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { isVerifiedRatesPublicNavEnabled } from "@/lib/verified-rates/public-gate";

const LegacyHomeView = dynamic(
  () => import("../LegacyHomeView").then((m) => m.LegacyHomeView),
  { ssr: true }
);

export const metadata = buildHomeMetadata();

import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { toHomeArticle } from "@/lib/homepage/generated-feed";

/** ISR — edge-friendly cache, 60s freshness */
export const revalidate = 60;

/** Approved Jan Darpan app Home — Broad platform content discovery */
async function ReaderDesignHomeFeed() {
  const [feed, pool, tenant, readerLanguage] = await Promise.all([
    getCachedGeneratedHomepageFeed(),
    fetchGeneratedArticlePool(150, { select: "homepage" }),
    getTenantConfig(),
    getServerReaderLanguage(),
  ]);

  const poolArticles = pool
    .map((row) => toHomeArticle(row, undefined, readerLanguage))
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const trending = buildTrendingKeywords({ limit: 12 });
  const storyCount = (feed ? feed.trending.length + feed.liveWire.length : 0) + poolArticles.length;

  return (
    <>
      <JsonLdScript data={homepageJsonLd({ storyCount, trendingKeywords: trending })} />
      {feed || poolArticles.length > 0 ? (
        <ReaderHomepage
          feed={feed ? pruneFeedForReader(feed) : ({} as any)}
          allArticles={poolArticles}
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

export default function HomePage() {
  if (isReaderDesignSystemEnabled()) {
    return (
      <Suspense fallback={<HomepageLoadingView />}>
        <ReaderDesignHomeFeed />
      </Suspense>
    );
  }

  return <LegacyHomeView />;
}
