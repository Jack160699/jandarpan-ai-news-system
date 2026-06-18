/**
 * Editorial dashboard mutations
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { asJson, jsonObjectFrom } from "@/types/json";
import { RSS_SOURCES } from "@/lib/news/providers/rss-sources";
import { buildPublicPublishPatch } from "@/lib/newsroom/publish-state";
import type { EditorialArticleStatus } from "@/lib/editorial-dashboard/types";
import type { GeneratedArticleInsert } from "@/lib/types/newsroom";

export type EditorialActionResult = {
  ok: boolean;
  message?: string;
};

export async function setArticleEditorialStatus(
  articleId: string,
  status: EditorialArticleStatus
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const supabase = createAdminServerClient();
  const now = new Date().toISOString();

  const patch: Partial<GeneratedArticleInsert> = {
    editorial_status: status,
    reviewed_at: now,
  };

  if (status === "approved") {
    Object.assign(patch, buildPublicPublishPatch(new Date(now)));
  }
  if (status === "rejected") {
    patch.published_at = null;
    patch.workflow_status = "draft";
    patch.homepage_pin = false;
  }

  const { error } = await supabase
    .from("generated_articles")
    .update({
      editorial_status: patch.editorial_status,
      reviewed_at: patch.reviewed_at,
      published_at: patch.published_at,
      workflow_status: patch.workflow_status,
      homepage_pin: patch.homepage_pin,
    })
    .eq("id", articleId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setHomepagePin(
  articleId: string,
  pinned: boolean
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const supabase = createAdminServerClient();

  if (pinned) {
    await supabase
      .from("generated_articles")
      .update({ homepage_pin: false })
      .eq("homepage_pin", true);
  }

  const patch: Partial<GeneratedArticleInsert> = {
    homepage_pin: pinned,
    pinned_at: pinned ? new Date().toISOString() : null,
    editorial_status: "approved",
    reviewed_at: new Date().toISOString(),
  };
  if (pinned) patch.published_at = new Date().toISOString();

  const { error } = await supabase
    .from("generated_articles")
    .update(patch)
    .eq("id", articleId);

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
    .eq("id", articleId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setArticleBreaking(
  articleId: string,
  isBreaking: boolean
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const supabase = createAdminServerClient();
  const { data: row } = await supabase
    .from("generated_articles")
    .select("editorial_metadata")
    .eq("id", articleId)
    .maybeSingle();

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
    .eq("id", articleId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setArticleFeatured(
  articleId: string,
  featured: boolean
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const supabase = createAdminServerClient();
  const { data: row } = await supabase
    .from("generated_articles")
    .select("editorial_metadata")
    .eq("id", articleId)
    .maybeSingle();

  const meta = jsonObjectFrom(row?.editorial_metadata);
  const pinResult = await setHomepagePin(articleId, featured);

  await supabase
    .from("generated_articles")
    .update({
      editorial_metadata: asJson({ ...meta, is_featured: featured }),
    })
    .eq("id", articleId);

  return pinResult;
}

export async function manualPublishArticle(
  articleId: string
): Promise<EditorialActionResult> {
  return setArticleEditorialStatus(articleId, "approved");
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
