import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { buildHomeMetadata, buildTrendingKeywords, homepageJsonLd } from "@/lib/seo";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { Footer } from "@/sections/Footer";
import {
  HomepageEmpty,
  HomepageSkeleton,
  HomepageView,
} from "@/sections/homepage";

export const metadata = buildHomeMetadata();

/** ISR — edge-friendly cache, 60s freshness */
/** ISR — keep in sync with HOMEPAGE_CACHE_SECONDS (default 60) */
export const revalidate = 60;

async function HomepageContent() {
  const [feed, tenant] = await Promise.all([
    getCachedGeneratedHomepageFeed(),
    getTenantConfig(),
  ]);

  if (!feed) {
    return <HomepageEmpty />;
  }

  return (
    <HomepageView
      feed={feed}
      brandName={tenant.branding.nameEn}
    />
  );
}

export default async function Home() {
  const feed = await getCachedGeneratedHomepageFeed();
  const trending = buildTrendingKeywords({ limit: 12 });
  const storyCount = feed
    ? feed.trending.length + feed.liveWire.length + 1
    : 0;

  return (
    <PageShell variant="news">
      <JsonLdScript
        data={homepageJsonLd({
          storyCount,
          trendingKeywords: trending,
        })}
      />
      <main
        id="main-content"
        className="nr-root relative z-[2]"
        role="main"
      >
        <Suspense fallback={<HomepageSkeleton />}>
          <HomepageContent />
        </Suspense>
        <Footer />
      </main>
    </PageShell>
  );
}
