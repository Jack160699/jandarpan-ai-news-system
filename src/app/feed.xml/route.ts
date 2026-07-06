import { NextResponse } from "next/server";
import { fetchOrganizationSettings } from "@/lib/organization/settings";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { SITE_URL } from "@/lib/seo/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [org, pool] = await Promise.all([
    fetchOrganizationSettings(),
    fetchGeneratedArticlePool(50).catch(() => []),
  ]);

  const items = pool
    .filter((row) => row.slug && row.headline)
    .map((row) => {
      const url = `${SITE_URL}/story/${encodeURIComponent(row.slug)}`;
      const pubDate = row.published_at ?? row.created_at;
      return `
    <item>
      <title>${escapeXml(row.headline)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
      ${row.summary ? `<description>${escapeXml(row.summary)}</description>` : ""}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(org.organizationName)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml("Chhattisgarh news — district bureaus, state desk, and live coverage.")}</description>
    <language>hi-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
