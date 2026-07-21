import { buildRatesSitemapXml } from "@/lib/verified-rates/sitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const xml = await buildRatesSitemapXml();
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
