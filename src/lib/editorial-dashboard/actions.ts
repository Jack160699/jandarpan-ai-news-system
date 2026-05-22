/**
 * Editorial dashboard mutations
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { RSS_SOURCES } from "@/lib/news/providers/rss-sources";
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
    patch.published_at = now;
  }
  if (status === "rejected") {
    patch.published_at = null;
    patch.homepage_pin = false;
  }

  const { error } = await supabase
    .from("generated_articles")
    .update(patch)
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
