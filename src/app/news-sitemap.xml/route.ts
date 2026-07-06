import {
  buildGoogleNewsEntries,
  buildGoogleNewsSitemapXml,
} from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>`;

  try {
    const entries = await buildGoogleNewsEntries();
    xml = buildGoogleNewsSitemapXml(entries);
  } catch {
    /* DB optional */
  }

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
