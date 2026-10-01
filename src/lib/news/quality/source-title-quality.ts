/**
 * Source-title quality: recognises "events" whose canonical title is not a story at all, so they can be rejected
 * BEFORE any LLM call is spent on them.
 *
 * Seen in production (2026-09-30): e-paper page listings such as
 *   "30092026 Raipur Main - 30 Sep 2026 - Page 10 - epaper.haribhoomi.com"
 * were clustered as events with urgency 90, ranked first, cost two paid calls, and one draft
 * ("Raipur News Updates: Comprehensive Coverage for September 30, 2026") even passed the publication gates.
 * An e-paper page is a scan of a printed page, not reportable news text.
 */

import { isRoundupHeadline } from "@/lib/news/quality/headline-quality";

const EPAPER_HOST_RE = /\b[a-z0-9-]*e-?paper[a-z0-9.-]*\.(com|in|net|org|co)\b/i;
/** "DDMMYYYY <edition> - 30 Sep 2026 - Page 10" (any site). */
const DATED_PAGE_LISTING_RE = /^\d{8}\s+.+?\s[-–]\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\s+[-–]\s+(page|पृष्ठ)\s*\d+/i;
const EPAPER_WORD_RE = /\be-?paper\b|ई-?पेपर/i;
const PAGE_NUMBER_RE = /\b(page|pg)\.?\s*\d+\b|पृष्ठ\s*\d+/i;

/**
 * Aggregator "live news page" / roundup events ("पढ़ें 2 अक्टूबर के मुख्य और ताजा समाचार - लाइव ब्रेकिंग न्यूज"). The
 * headline gate rejects every draft of these (headline:generic_roundup, body_too_short_for_type), but only AFTER a paid
 * generate + repair (~8k CodeCraft tokens per candidate; 4 candidates = ~32k tokens in 20 minutes in production).
 * Reuses the pipeline's own roundup detector - no new rules - so it can be rejected before any LLM call.
 */
export function isGenericRoundupSourceTitle(title: string | null | undefined): boolean {
  const t = (title ?? "").trim();
  return t.length > 0 && isRoundupHeadline(t);
}

export function isEpaperPageListingTitle(title: string | null | undefined): boolean {
  const t = (title ?? "").trim();
  if (!t) return false;
  if (EPAPER_HOST_RE.test(t)) return true;
  if (DATED_PAGE_LISTING_RE.test(t)) return true;
  return EPAPER_WORD_RE.test(t) && PAGE_NUMBER_RE.test(t);
}
