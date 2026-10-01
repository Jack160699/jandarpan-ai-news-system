/**
 * Language-version links for the "one story, several language representations" model.
 *
 * A validated translation lives in the source article's own `translations` bundle (that is what the reader feeds
 * resolve for a reader language). This module additionally records the relationship in `story_language_links`
 * (decision 'translation_of') so the en/hi pair is queryable and auditable alongside the dedupe decisions.
 */

import { createAdminServerClient } from "@/lib/supabase";

export type TranslationLinkRow = {
  event_id: string;
  candidate_language: string;
  matched_article_id: string;
  matched_language: string;
  similarity: number;
  decision: "translation_of";
  mode: "enforce";
  enforced: true;
};

/** Pure: the link row for one stored translation, or null when it cannot be linked (no event). */
export function buildTranslationLink(input: {
  articleId: string;
  eventId: string | null | undefined;
  sourceLanguage: string;
  targetLanguage: string;
}): TranslationLinkRow | null {
  if (!input.eventId) return null; // story_language_links is keyed by (event_id, matched_article_id)
  if (input.sourceLanguage === input.targetLanguage) return null;
  return {
    event_id: input.eventId,
    candidate_language: input.targetLanguage,
    matched_article_id: input.articleId,
    matched_language: input.sourceLanguage,
    similarity: 1,
    decision: "translation_of",
    mode: "enforce",
    enforced: true,
  };
}

/**
 * Best-effort (never throws): a failed link write must not undo a stored translation. Awaited by the caller - on Edge a
 * fire-and-forget write can be dropped when the isolate ends. An existing (event, article) link is left untouched.
 */
export async function recordTranslationLinks(rows: TranslationLinkRow[]): Promise<number> {
  if (!rows.length) return 0;
  try {
    const { error } = await createAdminServerClient()
      .from("story_language_links" as never)
      .upsert(rows as never, { onConflict: "event_id,matched_article_id", ignoreDuplicates: true });
    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}
