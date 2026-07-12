import {
  buildGoogleNewsEntries,
  buildGoogleNewsSitemapXml,
  buildEmptyGoogleNewsSitemapXml,
  GOOGLE_NEWS_WINDOW_HOURS,
} from "@/lib/seo";
import { logLiveFeed } from "@/lib/news/live-feed/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  let xml = buildEmptyGoogleNewsSitemapXml();
  let entryCount = 0;

  try {
    const entries = await buildGoogleNewsEntries();
    entryCount = entries.length;
    xml = buildGoogleNewsSitemapXml(entries);

    if (entryCount === 0) {
      logLiveFeed("google_news_sitemap_empty", {
        reason: `no_public_generated_articles_within_${GOOGLE_NEWS_WINDOW_HOURS}h`,
        table: "generated_articles",
      });
    } else {
      logLiveFeed("google_news_sitemap_built", { entryCount });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logLiveFeed("google_news_sitemap_error", { message });
    xml = buildEmptyGoogleNewsSitemapXml(
      `News sitemap generation failed: ${message}`
    );
  }

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-News-Sitemap-Entries": String(entryCount),
    },
  });
}
