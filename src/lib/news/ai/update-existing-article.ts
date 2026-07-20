/**
 * Append a material update to an already-published generated article.
 * Does NOT create a new URL / slug; preserves published_at.
 */

import { createAdminServerClient } from "@/lib/supabase";
import { asJson } from "@/types/json";
import { tagGeoFromContent } from "@/lib/regional/geo-tagging";
import type {
  EditorialMetadata,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

export type UpdateExistingArticleResult = {
  ok: boolean;
  skipped: boolean;
  reason: string;
  articleId?: string;
  newSignalCount?: number;
};

type ArticleUpdateEntry = {
  timestamp: string;
  signal_ids: string[];
  summary: string;
  source_urls?: string[];
};

function asMeta(value: unknown): EditorialMetadata & Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as EditorialMetadata & Record<string, unknown>;
  }
  return {};
}

function checkpointUrls(
  meta: EditorialMetadata & Record<string, unknown>
): Set<string> {
  const urls = new Set<string>();
  const checkpoint = meta.update_checkpoint;
  if (checkpoint && typeof checkpoint === "object" && !Array.isArray(checkpoint)) {
    const list = (checkpoint as { source_urls?: unknown }).source_urls;
    if (Array.isArray(list)) {
      for (const u of list) {
        if (typeof u === "string" && u.trim()) urls.add(u.trim());
      }
    }
  }
  const attributions = meta.source_attribution;
  if (Array.isArray(attributions)) {
    for (const a of attributions) {
      if (a?.article_url?.trim()) urls.add(a.article_url.trim());
    }
  }
  return urls;
}

async function loadSignalsForEventIds(
  signalIds: string[]
): Promise<NewsSignalRow[]> {
  if (!signalIds.length) return [];
  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("news_signals")
    .select("*")
    .in("id", signalIds);
  if (error) return [];
  return (data ?? []) as NewsSignalRow[];
}

/**
 * If the event already has a published article and new signal URLs arrived
 * since the last update_checkpoint, append an editorial_metadata.updates[]
 * timeline entry. Preserves slug + published_at.
 */
export async function updateExistingPublishedArticle(
  eventId: string
): Promise<UpdateExistingArticleResult> {
  const supabase = createAdminServerClient();

  const { data: article, error: articleErr } = await supabase
    .from("generated_articles")
    .select(
      "id, slug, headline, summary, article_body, published_at, workflow_status, editorial_metadata, geo_metadata, event_id, tags"
    )
    .eq("event_id", eventId)
    .eq("workflow_status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (articleErr) {
    return { ok: false, skipped: true, reason: articleErr.message };
  }
  if (!article) {
    return { ok: false, skipped: true, reason: "no_published_article" };
  }

  const { data: eventRow, error: eventErr } = await supabase
    .from("news_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr || !eventRow) {
    return {
      ok: false,
      skipped: true,
      reason: eventErr?.message ?? "event_not_found",
      articleId: article.id as string,
    };
  }

  const event = eventRow as NewsEventRow;
  const signals = await loadSignalsForEventIds(event.signal_ids ?? []);
  const meta = asMeta(article.editorial_metadata);
  const knownUrls = checkpointUrls(meta);

  const newSignals = signals.filter((s) => {
    const url = s.article_url?.trim();
    return Boolean(url) && !knownUrls.has(url!);
  });

  if (newSignals.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: "no_material_new_signals",
      articleId: article.id as string,
      newSignalCount: 0,
    };
  }

  const nowIso = new Date().toISOString();
  const newUrls = newSignals
    .map((s) => s.article_url?.trim())
    .filter((u): u is string => Boolean(u));
  const signalIds = newSignals.map((s) => s.id);

  const updateEntry: ArticleUpdateEntry = {
    timestamp: nowIso,
    signal_ids: signalIds,
    summary: `Material update from ${newSignals.length} new source signal(s)`,
    source_urls: newUrls,
  };

  const priorUpdates = Array.isArray(meta.updates) ? meta.updates : [];
  const allCheckpointUrls = new Set([...knownUrls, ...newUrls]);
  const priorCheckpointIds = Array.isArray(
    (meta.update_checkpoint as { signal_ids?: string[] } | undefined)?.signal_ids
  )
    ? ((meta.update_checkpoint as { signal_ids: string[] }).signal_ids ?? [])
    : [];

  const nextMeta: EditorialMetadata & Record<string, unknown> = {
    ...meta,
    updates: [...priorUpdates, updateEntry],
    update_checkpoint: {
      at: nowIso,
      source_urls: [...allCheckpointUrls],
      signal_ids: [...new Set([...priorCheckpointIds, ...signalIds])],
    },
    date_modified: nowIso,
  };

  const existingGeo = article.geo_metadata as Record<string, unknown> | null;
  const hasPrimary =
    existingGeo &&
    typeof existingGeo.primary_district === "string" &&
    existingGeo.primary_district.trim().length > 0;

  let geoPatch: Record<string, unknown> | undefined;
  if (!hasPrimary) {
    const retagged = tagGeoFromContent({
      title: String(article.headline ?? ""),
      body: [article.summary, article.article_body].filter(Boolean).join("\n"),
      region: event.region,
      category:
        event.category ??
        (Array.isArray(article.tags) ? String(article.tags[0] ?? "") : null),
    });
    geoPatch = retagged as unknown as Record<string, unknown>;
  }

  const patch: Record<string, unknown> = {
    editorial_metadata: asJson(nextMeta),
  };
  if (geoPatch) patch.geo_metadata = asJson(geoPatch);

  // Prefer editorial_metadata.date_modified; optionally bump updated_at if present.
  const { error: updateErr } = await supabase
    .from("generated_articles")
    .update({ ...patch, updated_at: nowIso })
    .eq("id", article.id);

  if (updateErr) {
    if (/updated_at|column/i.test(updateErr.message)) {
      const { error: retryErr } = await supabase
        .from("generated_articles")
        .update(patch)
        .eq("id", article.id);
      if (retryErr) {
        return {
          ok: false,
          skipped: false,
          reason: retryErr.message,
          articleId: article.id as string,
        };
      }
    } else {
      return {
        ok: false,
        skipped: false,
        reason: updateErr.message,
        articleId: article.id as string,
      };
    }
  }

  return {
    ok: true,
    skipped: false,
    reason: "updated",
    articleId: article.id as string,
    newSignalCount: newSignals.length,
  };
}
