import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { buildHomeMetadata, buildTrendingKeywords, homepageJsonLd } from "@/lib/seo";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { Footer } from "@/sections/Footer";
import { HomepageEmpty, HomepageView } from "@/sections/homepage";

export const metadata = buildHomeMetadata();

/** ISR — edge-friendly cache, 60s freshness */
export const revalidate = 60;

export default async function Home() {
  const [feed, tenant] = await Promise.all([
    getCachedGeneratedHomepageFeed(),
    getTenantConfig(),
  ]);

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
        {feed ? (
          <HomepageView
            feed={feed}
            brandName={tenant.branding.nameHi}
          />
        ) : (
          <HomepageEmpty />
        )}
        <Footer />
      </main>
    </PageShell>
  );
}
