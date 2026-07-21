import "server-only";

import { SITE_URL } from "@/lib/seo/constants";
import { listSupportedRateRoutes } from "@/lib/verified-rates/catalog";
import { verifiedRatesDb } from "@/lib/verified-rates/db";
import { isAlwaysIndexableRatePath } from "@/lib/verified-rates/public-gate";

async function acceptedSeriesKeys(): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const supabase = verifiedRatesDb();
    const { data } = await supabase
      .from("verified_rate_daily_snapshots")
      .select("category, city_slug, generated_at")
      .eq("status", "accepted")
      .order("generated_at", { ascending: false })
      .limit(400);
    if (!data) return set;
    for (const row of data as Array<{
      category: string;
      city_slug: string | null;
      generated_at: string;
    }>) {
      set.add(`${row.category}|${row.city_slug ?? ""}`);
    }
  } catch {
    /* empty */
  }
  return set;
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
  if (path.endsWith("/dataset")) return null;
  return null;
}

/**
 * Sitemap includes hubs/methodology always; detail pages only with accepted snapshots.
 * Empty dataset / empty price pages are omitted (Option C).
 */
export async function buildRatesSitemapXml(): Promise<string> {
  const accepted = await acceptedSeriesKeys();
  const routes = listSupportedRateRoutes().filter((r) => {
    if (isAlwaysIndexableRatePath(r.path)) return true;
    const key = pathKey(r.path);
    if (!key) return false;
    return accepted.has(key);
  });

  const urls = routes.map((r) => {
    const key = pathKey(r.path);
    const lastmod = new Date().toISOString();
    void key;
    return `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${isAlwaysIndexableRatePath(r.path) ? "0.6" : "0.7"}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}
