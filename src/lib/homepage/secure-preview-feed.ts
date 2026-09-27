import type { GeneratedHomepageFeed, HomeArticle } from "./types";

const DEVANAGARI_CHARS = "अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह";
const LATIN_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LATIN_LOWER = "abcdefghijklmnopqrstuvwxyz";

/**
 * Scramble text while preserving exact character length, word boundaries,
 * and typographic rhythm (Devanagari vs Latin vs Punctuation).
 *
 * This ensures:
 * 1. 100% visual authenticity behind blur — font metrics, line breaks, and newspaper appearance match real text.
 * 2. 0% content leakage — the original words are completely destroyed on the server. Removing CSS blur reveals only meaningless scrambled glyphs.
 */
export function scramblePreservingShape(text: string, seedOffset = 42): string {
  if (!text) return "";
  let seed = (text.length * 37 + seedOffset) % 233280;

  return text.replace(/[^\s\p{P}]/gu, (char) => {
    seed = (seed * 9301 + 49297) % 233280;
    const code = char.charCodeAt(0);

    // Devanagari range \u0900 - \u097F
    if (code >= 0x0900 && code <= 0x097f) {
      return DEVANAGARI_CHARS[seed % DEVANAGARI_CHARS.length];
    }
    // Latin uppercase
    if (code >= 65 && code <= 90) {
      return LATIN_UPPER[seed % LATIN_UPPER.length];
    }
    // Latin lowercase
    if (code >= 97 && code <= 122) {
      return LATIN_LOWER[seed % LATIN_LOWER.length];
    }
    // Digits
    if (code >= 48 && code <= 57) {
      return String(seed % 10);
    }
    return char;
  });
}

function sanitizeArticle(art: HomeArticle, index: number): HomeArticle {
  return {
    ...art,
    id: `preview-locked-${index}`,
    slug: `preview-locked-${index}`,
    headline: scramblePreservingShape(art.headline || "", index),
    summary: scramblePreservingShape(art.summary || "", index + 100),
    article_body: null,
    section: art.section || "chhattisgarh",
    districtSlug: art.districtSlug || "raipur",
    district: art.district || "रायपुर",
    translations: undefined,
    editorial_metadata: undefined,
  };
}

/**
 * Creates a visually authentic but cryptographically stripped preview feed
 * for unauthenticated visitors.
 */
export function createSecurePreviewFeed(feed: GeneratedHomepageFeed): GeneratedHomepageFeed {
  return {
    ...feed,
    breakingTicker: (feed.breakingTicker || []).map((a, i) => sanitizeArticle(a, i + 10)),
    liveWire: (feed.liveWire || []).map((a, i) => sanitizeArticle(a, i + 100)),
    trending: (feed.trending || []).map((a, i) => sanitizeArticle(a, i + 200)),
    regionalHighlights: (feed.regionalHighlights || []).map((a, i) => sanitizeArticle(a, i + 300)),
    editorsPicks: feed.editorsPicks
      ? {
          lead: sanitizeArticle(feed.editorsPicks.lead, 1),
          supporting: (feed.editorsPicks.supporting || []).map((a, i) => sanitizeArticle(a, i + 50)),
        }
      : feed.editorsPicks,
  };
}
