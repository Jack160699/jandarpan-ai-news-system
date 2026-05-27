/**
 * District trend heatmap for Chhattisgarh desk
 */

import { geoFromRecord } from "@/lib/regional/geo-tagging";
import { loadPlatformDistricts } from "@/lib/newsroom-platform/config/districts";
import type { DistrictHeatCell } from "@/lib/intelligence/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import { jsonObjectFrom } from "@/types/json";

export async function buildDistrictHeatmap(
  articles: GeneratedArticleRow[],
  windowHours = 72
): Promise<DistrictHeatCell[]> {
  const since = Date.now() - windowHours * 3_600_000;
  const cells = new Map<
    string,
    { count: number; breaking: number; confSum: number; confN: number }
  >();

  for (const row of articles) {
    const ts = new Date(row.published_at ?? row.created_at).getTime();
    if (ts < since) continue;

    const geo = geoFromRecord(row);
    const districts =
      geo.districts.length > 0 ? geo.districts : geo.is_chhattisgarh ? ["statewide"] : [];

    const meta = jsonObjectFrom(row.editorial_metadata as import("@/types/supabase").Json);
    const conf = (meta.ai_confidence as number) ?? 0.5;
    const breaking = Boolean(meta.is_breaking);

    for (const slug of districts) {
      const c = cells.get(slug) ?? { count: 0, breaking: 0, confSum: 0, confN: 0 };
      c.count += 1;
      if (breaking) c.breaking += 1;
      c.confSum += conf;
      c.confN += 1;
      cells.set(slug, c);
    }
  }

  const maxCount = Math.max(1, ...[...cells.values()].map((c) => c.count));

  const districts = await loadPlatformDistricts();
  const districtMeta = new Map(districts.map((d) => [d.slug, d.nameEn]));

  return [...cells.entries()]
    .map(([slug, c]) => ({
      districtSlug: slug,
      districtName: districtMeta.get(slug) ?? slug,
      intensity: Math.round((c.count / maxCount) * 1000) / 1000,
      articleCount: c.count,
      breakingCount: c.breaking,
      avgConfidence: c.confN ? Math.round((c.confSum / c.confN) * 1000) / 1000 : 0,
    }))
    .sort((a, b) => b.intensity - a.intensity);
}
