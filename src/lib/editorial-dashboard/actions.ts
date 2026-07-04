/**
 * Editorial dashboard mutations — tenant-scoped service-role writes
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { asJson, jsonObjectFrom } from "@/types/json";
import { RSS_SOURCES } from "@/lib/news/providers/rss-sources";
import {
  publishGeneratedArticle,
  rejectGeneratedArticle,
} from "@/lib/editorial/publication";
import type { EditorialArticleStatus } from "@/lib/editorial-dashboard/types";

export type EditorialActionResult = {
  ok: boolean;
  message?: string;
};

export async function setArticleEditorialStatus(
  articleId: string,
  tenantId: string,
  status: EditorialArticleStatus
): Promise<EditorialActionResult> {
  if (status === "approved") {
    return publishGeneratedArticle(articleId, tenantId);
  }
  if (status === "rejected") {
    return rejectGeneratedArticle(articleId, tenantId);
  }

  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("generated_articles")
    .update({
      editorial_status: status,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", articleId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setHomepagePin(
  articleId: string,
  tenantId: string,
  pinned: boolean
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const supabase = createAdminServerClient();

  if (pinned) {
    await supabase
      .from("generated_articles")
      .update({ homepage_pin: false })
      .eq("homepage_pin", true)
      .eq("tenant_id", tenantId);
  }

  const { error } = await supabase
    .from("generated_articles")
    .update({
      homepage_pin: pinned,
      pinned_at: pinned ? new Date().toISOString() : null,
    })
    .eq("id", articleId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function disableRssSource(
  sourceId: string,
  hours = 48
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const source = RSS_SOURCES.find((s) => s.id === sourceId);
  if (!source) return { ok: false, message: "Unknown source" };

  const until = new Date();
  until.setHours(until.getHours() + hours);

  const supabase = createAdminServerClient();
  const { error } = await supabase.from("rss_source_health").upsert(
    {
      source_id: source.id,
      name: source.name,
      disabled_until: until.toISOString(),
      consecutive_failures: 99,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "source_id" }
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Disabled ${hours}h` };
}

export async function updateArticleHeadline(
  articleId: string,
  tenantId: string,
  headline: string
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };
  const trimmed = headline.trim();
  if (trimmed.length < 4) return { ok: false, message: "Headline too short" };

  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("generated_articles")
    .update({
      headline: trimmed,
      seo_title: trimmed.slice(0, 70),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", articleId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setArticleBreaking(
  articleId: string,
  tenantId: string,
  isBreaking: boolean
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const supabase = createAdminServerClient();
  const { data: row } = await supabase
    .from("generated_articles")
    .select("editorial_metadata")
    .eq("id", articleId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!row) return { ok: false, message: "Article not found" };

  const meta = jsonObjectFrom(row?.editorial_metadata);
  const { error } = await supabase
    .from("generated_articles")
    .update({
      editorial_metadata: asJson({
        ...meta,
        is_breaking: isBreaking,
        breaking_marked_at: isBreaking ? new Date().toISOString() : null,
      }),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", articleId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setArticleFeatured(
  articleId: string,
  tenantId: string,
  featured: boolean
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const supabase = createAdminServerClient();
  const { data: row } = await supabase
    .from("generated_articles")
    .select("editorial_metadata")
    .eq("id", articleId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!row) return { ok: false, message: "Article not found" };

  const meta = jsonObjectFrom(row?.editorial_metadata);
  const pinResult = await setHomepagePin(articleId, tenantId, featured);

  await supabase
    .from("generated_articles")
    .update({
      editorial_metadata: asJson({ ...meta, is_featured: featured }),
    })
    .eq("id", articleId)
    .eq("tenant_id", tenantId);

  return pinResult;
}

/** @deprecated Use approve action — alias preserved for keyboard shortcuts */
export async function manualPublishArticle(
  articleId: string,
  tenantId: string
): Promise<EditorialActionResult> {
  return publishGeneratedArticle(articleId, tenantId);
}

export async function enableRssSource(
  sourceId: string
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const source = RSS_SOURCES.find((s) => s.id === sourceId);
  if (!source) return { ok: false, message: "Unknown source" };

  const supabase = createAdminServerClient();
  const { error } = await supabase.from("rss_source_health").upsert(
    {
      source_id: source.id,
      name: source.name,
      disabled_until: null,
      consecutive_failures: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "source_id" }
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
