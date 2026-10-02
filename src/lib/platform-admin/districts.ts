import { geoFromRecord } from "@/lib/regional/geo-tagging";
import type { DistrictHubMeta } from "@/lib/newsroom-platform/content/types";
import type { DistrictRow } from "@/lib/newsroom-platform/db/types";
import { cachedRead } from "@/lib/infrastructure/cache/shared-read-cache";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { AdminDistrictRecord } from "./types";

/**
 * Article counts per district. Cached (hub pages, the sitemap and the heatmap all call this on every request) and read with a
 * JSON-path projection: it used to pull up to 800 whole generated_articles rows -- editorial_metadata alone averages ~9 KB --
 * for a count (measured: ~0.9 MB per call, 8,447 calls in 14 days). Only the fields geoFromRecord() and the breaking flag
 * actually read are selected now (~1 KB/row).
 */
// Hub counts change slowly and are crawled constantly: one read per hour (~15 KB each at 100 rows, ~110 KB at the 800-row cap).
const DISTRICT_COUNT_TTL_SECONDS = 3600;
const DISTRICT_COUNT_TAGGED_SELECT =
  "districts:geo_metadata->districts, is_cg:geo_metadata->is_chhattisgarh, is_breaking:editorial_metadata->is_breaking";
const DISTRICT_COUNT_SELECT =
  "headline, summary, tags, geo_metadata, regional:editorial_metadata->regional, is_breaking:editorial_metadata->is_breaking, created_at";

async function countArticlesByDistrict(): Promise<
  Map<string, { total: number; live: number }>
> {
  if (!isSupabaseConfigured()) return new Map();
  const entries = await cachedRead(
    ["platform-district-counts-v1"],
    { ttlSeconds: DISTRICT_COUNT_TTL_SECONDS, tags: ["platform-hubs", "generated-stories"] },
    async () => [...(await countArticlesByDistrictUncached())]
  );
  return new Map(entries);
}

async function countArticlesByDistrictUncached(): Promise<
  Map<string, { total: number; live: number }>
> {
  const counts = new Map<string, { total: number; live: number }>();

  const supabase = createAdminServerClient();
  const since = new Date();
  since.setDate(since.getDate() - 14);

  // Two reads instead of one wide one. geoFromRecord() uses the stored geo tag directly whenever it has tagged_at + state (99% of
  // rows), so those rows need only their district array, the CG flag and the breaking flag (~130 B/row, measured). The rare untagged
  // row falls back to text classification and keeps the wide projection. Newest first so the 800-row cap drops the oldest.
  const TAGGED = "geo_metadata->>tagged_at";
  const STATE = "geo_metadata->>state";
  const [{ data: taggedRows }, { data: untaggedRows }, { data: platform }] = await Promise.all([
    supabase
      .from("generated_articles")
      .select(DISTRICT_COUNT_TAGGED_SELECT)
      .gte("created_at", since.toISOString())
      .not(TAGGED, "is", null)
      .not(STATE, "is", null)
      .order("created_at", { ascending: false })
      .limit(800),
    supabase
      .from("generated_articles")
      .select(DISTRICT_COUNT_SELECT)
      .gte("created_at", since.toISOString())
      .or(`${TAGGED}.is.null,${STATE}.is.null`)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("platform_articles")
      .select("district_slug, is_breaking, published_at")
      .gte("published_at", since.toISOString())
      .limit(500),
  ]);

  const bump = (slugs: string[], breaking: boolean) => {
    for (const slug of slugs) {
      const c = counts.get(slug) ?? { total: 0, live: 0 };
      c.total += 1;
      if (breaking) c.live += 1;
      counts.set(slug, c);
    }
  };

  type TaggedRow = { districts: unknown; is_cg: unknown; is_breaking: unknown };
  for (const r of (taggedRows ?? []) as unknown as TaggedRow[]) {
    const districts = Array.isArray(r.districts) ? (r.districts as string[]) : [];
    bump(districts.length > 0 ? districts : r.is_cg === true ? ["statewide"] : [], r.is_breaking === true);
  }

  type CountRow = Pick<GeneratedArticleRow, "headline" | "summary" | "tags" | "geo_metadata"> & {
    regional: unknown;
    is_breaking: unknown;
  };
  for (const projected of (untaggedRows ?? []) as unknown as CountRow[]) {
    const row = {
      headline: projected.headline,
      summary: projected.summary,
      tags: projected.tags,
      geo_metadata: projected.geo_metadata,
      editorial_metadata: { regional: projected.regional, is_breaking: projected.is_breaking },
    } as unknown as GeneratedArticleRow;
    const geo = geoFromRecord(row);
    bump(geo.districts.length > 0 ? geo.districts : geo.is_chhattisgarh ? ["statewide"] : [], Boolean(row.editorial_metadata?.is_breaking));
  }

  for (const row of platform ?? []) {
    const slug = row.district_slug as string | null;
    if (!slug) continue;
    const c = counts.get(slug) ?? { total: 0, live: 0 };
    c.total += 1;
    if (row.is_breaking) c.live += 1;
    counts.set(slug, c);
  }

  return counts;
}

export async function listAdminDistricts(): Promise<AdminDistrictRecord[] | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("platform_districts")
    .select("*")
    .order("priority_tier", { ascending: true })
    .order("slug", { ascending: true });

  if (error) {
    console.error("[platform-admin] districts:", error.message);
    return null;
  }

  const counts = await countArticlesByDistrict();

  const slugs = (data ?? []).map((d) => d.slug as string);
  const viewsMap = new Map<string, number>();

  if (slugs.length) {
    const { data: metrics } = await supabase
      .from("reader_analytics_events")
      .select("region")
      .eq("event_type", "article_view")
      .in("region", slugs)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());

    for (const ev of metrics ?? []) {
      const r = ev.region as string;
      if (!r) continue;
      viewsMap.set(r, (viewsMap.get(r) ?? 0) + 1);
    }
  }

  return ((data ?? []) as DistrictRow[]).map((row) => {
    const slug = row.slug;
    const c = counts.get(slug) ?? { total: 0, live: 0 };
    return {
      slug,
      nameEn: row.name_en,
      nameHi: row.name_hi,
      priorityTier: row.priority_tier,
      enabled: row.enabled,
      sections: row.sections ?? [],
      homepageConfig: row.homepage_config ?? {},
      editorUserIds: row.editor_user_ids ?? [],
      trendScore: Number(row.trend_score ?? 0),
      articleCount: c.total,
      liveCount: c.live,
      views7d: viewsMap.get(slug) ?? 0,
      metadata: row.metadata ?? {},
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    };
  });
}

export async function loadPlatformDistrictsHub(): Promise<DistrictHubMeta[]> {
  return cachedRead(
    ["platform-districts-hub-v1"],
    { ttlSeconds: DISTRICT_COUNT_TTL_SECONDS, tags: ["platform-hubs"] },
    loadPlatformDistrictsHubUncached
  );
}

async function loadPlatformDistrictsHubUncached(): Promise<DistrictHubMeta[]> {
  const rows = await listAdminDistricts();
  if (!rows) return [];
  return rows
    .filter((d) => d.enabled)
    .map((d) => ({
      slug: d.slug,
      nameEn: d.nameEn,
      nameHi: d.nameHi,
      storyCount: d.articleCount,
      liveCount: d.liveCount,
      sections: d.sections,
    }));
}

export async function getPlatformDistrictHub(
  slug: string
): Promise<DistrictHubMeta | null> {
  const all = await loadPlatformDistrictsHub();
  return all.find((d) => d.slug === slug) ?? null;
}

export async function getPlatformDistrictSlugs(): Promise<string[]> {
  const all = await loadPlatformDistrictsHub();
  return all.map((d) => d.slug);
}

export async function patchAdminDistrict(
  slug: string,
  patch: Partial<{
    nameEn: string;
    nameHi: string;
    priorityTier: number;
    enabled: boolean;
    sections: string[];
    homepageConfig: Record<string, unknown>;
    editorUserIds: string[];
  }>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.nameEn) update.name_en = patch.nameEn;
  if (patch.nameHi) update.name_hi = patch.nameHi;
  if (patch.priorityTier !== undefined) update.priority_tier = patch.priorityTier;
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  if (patch.sections) update.sections = patch.sections;
  if (patch.homepageConfig) update.homepage_config = patch.homepageConfig;
  if (patch.editorUserIds) update.editor_user_ids = patch.editorUserIds;

  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("platform_districts")
    .update(update as never)
    .eq("slug", slug);

  if (error) {
    console.error("[platform-admin] patch district:", error.message);
    return false;
  }
  return true;
}

export async function createAdminDistrict(input: {
  slug: string;
  nameEn: string;
  nameHi: string;
  priorityTier?: number;
  sections?: string[];
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createAdminServerClient();
  const { error } = await supabase.from("platform_districts").insert({
    slug: input.slug,
    name_en: input.nameEn,
    name_hi: input.nameHi,
    priority_tier: input.priorityTier ?? 2,
    sections: input.sections ?? ["top", "crime", "politics"],
    enabled: true,
  });

  if (error) {
    console.error("[platform-admin] create district:", error.message);
    return false;
  }
  return true;
}
