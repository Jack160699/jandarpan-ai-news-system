import { buildRejectPatch } from "@/lib/editorial/publication";
import { buildPublicPublishPatch } from "@/lib/newsroom/publish-state";
import { geoFromRecord } from "@/lib/regional/geo-tagging";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { asJson, jsonObjectFrom, type JsonObject } from "@/types/json";
import type { EditorialMetadata } from "@/lib/types/newsroom";
import type {
  AdminArticleListItem,
  AdminArticleListResult,
  ArticleListFilters,
} from "./types";

const GENERATED_SELECT =
  "id, slug, headline, summary, language, tags, published_at, editorial_status, workflow_status, homepage_pin, seo_title, seo_description, editorial_metadata, geo_metadata, created_at";

const PLATFORM_SELECT =
  "id, slug, title, excerpt, category, district_slug, language, published_at, is_breaking, seo_title, seo_description, views, trending_score, created_at, updated_at";

function metaBreaking(meta: JsonObject): boolean {
  return Boolean(meta.is_breaking);
}

function metaConfidence(meta: JsonObject): number | null {
  const c = meta.ai_confidence;
  return typeof c === "number" ? c : null;
}

function districtFromGeo(geo: ReturnType<typeof geoFromRecord>): string | null {
  return geo.districts[0] ?? (geo.is_chhattisgarh ? "statewide" : null);
}

async function loadMetricsBySlug(
  slugs: string[]
): Promise<Map<string, { views: number; clicks: number; engagements: number }>> {
  const map = new Map<string, { views: number; clicks: number; engagements: number }>();
  if (!slugs.length || !isSupabaseConfigured()) return map;

  const supabase = createAdminServerClient();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data } = await supabase
    .from("article_metrics_daily")
    .select("article_slug, views, clicks, engagements")
    .in("article_slug", slugs)
    .gte("bucket_date", since.toISOString().slice(0, 10));

  for (const row of data ?? []) {
    const slug = row.article_slug as string;
    const prev = map.get(slug) ?? { views: 0, clicks: 0, engagements: 0 };
    map.set(slug, {
      views: prev.views + ((row.views as number) ?? 0),
      clicks: prev.clicks + ((row.clicks as number) ?? 0),
      engagements: prev.engagements + ((row.engagements as number) ?? 0),
    });
  }
  return map;
}

export async function listAdminArticles(
  filters: ArticleListFilters = {},
  tenantId?: string
): Promise<AdminArticleListResult | null> {
  if (!isSupabaseConfigured()) return null;

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const sourceFilter = filters.source ?? "all";

  const supabase = createAdminServerClient();
  const items: AdminArticleListItem[] = [];

  if (sourceFilter !== "platform") {
    let q = supabase
      .from("generated_articles")
      .select(GENERATED_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(500);

    if (filters.workflowStatus && filters.workflowStatus !== "all") {
      q = q.eq("workflow_status", filters.workflowStatus);
    }
    if (filters.editorialStatus && filters.editorialStatus !== "all") {
      q = q.eq("editorial_status", filters.editorialStatus);
    }
    if (filters.language && filters.language !== "all") {
      q = q.eq("language", filters.language);
    }
    if (filters.search?.trim()) {
      const term = filters.search.trim().replace(/%/g, "");
      q = q.or(`headline.ilike.%${term}%,summary.ilike.%${term}%,slug.ilike.%${term}%`);
    }
    if (filters.published === "published") {
      q = q.not("published_at", "is", null);
    } else if (filters.published === "draft") {
      q = q.is("published_at", null);
    }
    if (tenantId) {
      q = q.eq("tenant_id", tenantId);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[platform-admin] generated articles:", error.message);
      return null;
    }

    for (const row of data ?? []) {
      const meta = jsonObjectFrom(row.editorial_metadata);
      const geo = geoFromRecord(row);
      const districtSlug = districtFromGeo(geo);
      const isBreaking = metaBreaking(meta);

      if (filters.district && filters.district !== "all" && districtSlug !== filters.district) {
        continue;
      }
      if (filters.breaking === true && !isBreaking) continue;
      if (filters.category && filters.category !== "all") {
        const cat = meta.category as string | undefined;
        if (cat && cat !== filters.category) continue;
      }

      items.push({
        id: row.id,
        source: "generated",
        slug: row.slug,
        title: row.headline,
        excerpt: row.summary,
        category: (meta.category as string | null) ?? null,
        districtSlug,
        language: row.language,
        editorialStatus: row.editorial_status ?? null,
        workflowStatus: row.workflow_status ?? null,
        publishedAt: row.published_at,
        isBreaking,
        homepagePin: Boolean(row.homepage_pin),
        seoTitle: row.seo_title,
        seoDescription: row.seo_description,
        views: 0,
        clicks: 0,
        engagements: 0,
        trendingScore: (meta.trend_score as number | undefined) ?? 0,
        aiConfidence: metaConfidence(meta),
        createdAt: row.created_at,
        updatedAt: null,
      });
    }
  }

  if (sourceFilter !== "generated") {
    let pq = supabase
      .from("platform_articles")
      .select(PLATFORM_SELECT, { count: "exact" })
      .order("published_at", { ascending: false })
      .limit(300);

    if (filters.district && filters.district !== "all") {
      pq = pq.eq("district_slug", filters.district);
    }
    if (filters.category && filters.category !== "all") {
      pq = pq.eq("category", filters.category);
    }
    if (filters.language && filters.language !== "all") {
      pq = pq.eq("language", filters.language);
    }
    if (filters.search?.trim()) {
      const term = filters.search.trim().replace(/%/g, "");
      pq = pq.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%,slug.ilike.%${term}%`);
    }
    if (filters.breaking === true) {
      pq = pq.eq("is_breaking", true);
    }

    const { data: platformRows, error: pErr } = await pq;
    if (pErr) {
      console.error("[platform-admin] platform articles:", pErr.message);
    } else {
      for (const row of platformRows ?? []) {
        items.push({
          id: row.id,
          source: "platform",
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          category: row.category,
          districtSlug: row.district_slug,
          language: row.language,
          editorialStatus: null,
          workflowStatus: row.published_at ? "published" : "draft",
          publishedAt: row.published_at,
          isBreaking: row.is_breaking,
          homepagePin: false,
          seoTitle: row.seo_title,
          seoDescription: row.seo_description,
          views: row.views ?? 0,
          clicks: 0,
          engagements: 0,
          trendingScore: Number(row.trending_score ?? 0),
          aiConfidence: null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    }
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const metrics = await loadMetricsBySlug(items.map((i) => i.slug));
  for (const item of items) {
    const m = metrics.get(item.slug);
    if (m) {
      item.views = m.views || item.views;
      item.clicks = m.clicks;
      item.engagements = m.engagements;
    }
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const facets = {
    workflowStatuses: [...new Set(items.map((i) => i.workflowStatus).filter(Boolean))] as string[],
    editorialStatuses: [...new Set(items.map((i) => i.editorialStatus).filter(Boolean))] as string[],
    districts: [...new Set(items.map((i) => i.districtSlug).filter(Boolean))] as string[],
    categories: [...new Set(items.map((i) => i.category).filter(Boolean))] as string[],
  };

  return { items: pageItems, total, page, pageSize, facets };
}

export type ArticlePatchPayload = {
  workflowStatus?: string;
  editorialStatus?: string;
  publishedAt?: string | null;
  homepagePin?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  isBreaking?: boolean;
};

export async function patchAdminArticle(
  id: string,
  source: "generated" | "platform",
  patch: ArticlePatchPayload,
  tenantId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createAdminServerClient();

  if (source === "generated") {
    const update: Record<string, unknown> = {};

    if (patch.workflowStatus === "published" || patch.editorialStatus === "approved") {
      Object.assign(update, buildPublicPublishPatch());
    } else if (patch.editorialStatus === "rejected") {
      Object.assign(update, buildRejectPatch());
    } else {
      if (patch.workflowStatus) update.workflow_status = patch.workflowStatus;
      if (patch.editorialStatus) update.editorial_status = patch.editorialStatus;
      if (patch.publishedAt !== undefined) update.published_at = patch.publishedAt;
    }

    if (patch.homepagePin !== undefined) update.homepage_pin = patch.homepagePin;
    if (patch.seoTitle !== undefined) update.seo_title = patch.seoTitle;
    if (patch.seoDescription !== undefined) update.seo_description = patch.seoDescription;

    if (patch.isBreaking !== undefined) {
      let existingQuery = supabase
        .from("generated_articles")
        .select("editorial_metadata")
        .eq("id", id);
      if (tenantId) existingQuery = existingQuery.eq("tenant_id", tenantId);
      const { data: existing } = await existingQuery.maybeSingle();
      if (!existing) return false;
      const meta = jsonObjectFrom(existing?.editorial_metadata);
      update.editorial_metadata = asJson({ ...meta, is_breaking: patch.isBreaking });
    }

    let updateQuery = supabase.from("generated_articles").update(update as never).eq("id", id);
    if (tenantId) updateQuery = updateQuery.eq("tenant_id", tenantId);
    const { error } = await updateQuery;
    if (error) {
      console.error("[platform-admin] patch generated:", error.message);
      return false;
    }
    return true;
  }

  const pUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.seoTitle !== undefined) pUpdate.seo_title = patch.seoTitle;
  if (patch.seoDescription !== undefined) pUpdate.seo_description = patch.seoDescription;
  if (patch.isBreaking !== undefined) pUpdate.is_breaking = patch.isBreaking;
  if (patch.publishedAt !== undefined) pUpdate.published_at = patch.publishedAt;

  const { error } = await supabase.from("platform_articles").update(pUpdate as never).eq("id", id);
  if (error) {
    console.error("[platform-admin] patch platform:", error.message);
    return false;
  }
  return true;
}
