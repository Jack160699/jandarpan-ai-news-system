/**
 * Live / TV story selection and ordering.
 *
 * Live uses exactly the same eligibility as Latest -- the canonical public gate plus the Chhattisgarh-first geography policy
 * (selectFeedRows, feed "cg_home") -- and the same strict newest-first ordering. Its only additional documented rules are:
 *   1. visual: the story needs verified, rights-clean media (a TV segment without a picture is not playable);
 *   2. language: the segment must exist in the requested language. A missing language is DROPPED, never papered over with a
 *      placeholder headline or summary;
 *   3. continuation: when the client asks for the NEXT batch and passes the ids it already played, unplayed stories lead and
 *      played ones follow (each group still newest-first). An initial request carries no played ids, so the queue always starts
 *      with the newest eligible story -- a viewer's history never reorders the head of a fresh session.
 *
 * Never used for ordering: queue position, insertion order, physical database order, created_at, engagement, source priority.
 */

import { selectFeedRows, type FeedRow, type FeedSelection } from "@/lib/feed/feed-selector";
import { isHeadlineFitForPublicFeed } from "@/lib/news/quality/headline-quality";

const DEVANAGARI = /[ऀ-ॿ]/;

/** The eligible Live rows, newest first. Same gate + geography policy as /latest. */
export function selectLiveRows<T extends FeedRow>(rows: readonly T[], now: Date = new Date()): FeedSelection<T> {
  return selectFeedRows(rows, { feed: "cg_home", order: "chronological", now });
}

export type LanguageRepresentation = {
  headlineHi?: string | null;
  headlineEn?: string | null;
  summaryHi?: string | null;
  summaryEn?: string | null;
  articleBodyHi?: string | null;
  articleBodyEn?: string | null;
};

/**
 * True when the story has a real, correctly-scripted, non-generic representation in the requested language.
 * Hindi must contain Devanagari; English must contain none. Needs a headline and at least a summary or body.
 */
export function hasLanguageRepresentation(c: LanguageRepresentation, lang: "hi" | "en"): boolean {
  const headline = (lang === "hi" ? c.headlineHi : c.headlineEn)?.trim() ?? "";
  const text = ((lang === "hi" ? c.summaryHi : c.summaryEn) || (lang === "hi" ? c.articleBodyHi : c.articleBodyEn) || "").trim();
  if (!headline || !text) return false;
  if (!isHeadlineFitForPublicFeed(headline)) return false;
  const headlineIsDevanagari = DEVANAGARI.test(headline);
  return lang === "hi" ? headlineIsDevanagari : !headlineIsDevanagari;
}

type Orderable = { id: string; publishedAt?: string | null };

function publishedMs(c: Orderable): number {
  const t = c.publishedAt ? new Date(c.publishedAt).getTime() : NaN;
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

/** published_at DESC, then id DESC. Total and deterministic. */
export function compareNewestFirst(a: Orderable, b: Orderable): number {
  const ta = publishedMs(a);
  const tb = publishedMs(b);
  if (tb !== ta) return tb > ta ? 1 : -1;
  return String(b.id).localeCompare(String(a.id));
}

export function orderLiveQueue<T extends Orderable>(
  candidates: readonly T[],
  options: { playedIds?: ReadonlySet<string>; continuation?: boolean } = {}
): T[] {
  const sorted = [...candidates].sort(compareNewestFirst);
  const played = options.playedIds;
  if (!options.continuation || !played || played.size === 0) return sorted;

  const unplayed = sorted.filter((c) => !played.has(c.id));
  const replay = sorted.filter((c) => played.has(c.id));
  // With almost nothing new, keep the pure newest-first loop rather than a thin unplayed head.
  return unplayed.length >= 3 ? [...unplayed, ...replay] : sorted;
}
