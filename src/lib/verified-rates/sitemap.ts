import "server-only";

import { SITE_URL } from "@/lib/seo/constants";
import { listSupportedRateRoutes } from "@/lib/verified-rates/catalog";
import { verifiedRatesDb } from "@/lib/verified-rates/db";

const CONTENT_EPOCH = new Date("2026-07-21T00:00:00+05:30");

async function latestGeneratedByCategoryCity(): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  try {
    const supabase = verifiedRatesDb();
    const { data } = await supabase
      .from("verified_rate_daily_snapshots")
      .select("category, city_slug, generated_at")
      .eq("status", "accepted")
      .order("generated_at", { ascending: false })
      .limit(200);
    if (!data) return map;
    for (const row of data as Array<{
      category: string;
      city_slug: string | null;
      generated_at: string;
    }>) {
      const key = `${row.category}|${row.city_slug ?? ""}`;
      if (!map.has(key)) map.set(key, new Date(row.generated_at));
    }
  } catch {
    /* empty */
  }
  return map;
}

function pathKey(path: string): string | null {
  if (path.includes("/petrol-price-today")) {
    const city = path.split("/")[3];
    return `petrol|${city ?? ""}`;
  }
  if (path.includes("/diesel-price-today")) {
    const city = path.split("/")[3];
    return `diesel|${city ?? ""}`;
  }
  if (path.endsWith("/gold-price-today")) return "gold_24k|";
  if (path.endsWith("/gold-22k-price-today")) return "gold_22k|";
  if (path.endsWith("/silver-price-today")) return "silver_999|";
  return null;
}

export async function buildRatesSitemapXml(): Promise<string> {
  const latest = await latestGeneratedByCategoryCity();
  const routes = listSupportedRateRoutes().filter((r) => r.indexable);

  const urls = routes.map((r) => {
    const key = pathKey(r.path);
    const lastmod = (key && latest.get(key)) || CONTENT_EPOCH;
    return `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <lastmod>${lastmod.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}
