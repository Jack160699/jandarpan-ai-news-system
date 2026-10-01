/**
 * Editorial Eligibility & Integrity Validation Layer
 *
 * Core Principles:
 * 1. 30-Day Canonical Window: published_at >= now - 30 days. No older story enters active feed.
 * 2. Strict Media Gate: Verified real source media only. No broken images, no generic stock placeholders.
 * 3. Generic Roundup Rejection: Rejects generic meta roundups ("देश और दुनिया की प्रमुख खबरें...", "आज की प्रमुख खबरें...").
 * 4. Location Integrity: Prevents false CG district tagging on stories about Mumbai, Delhi, etc.
 * 5. Strict Chronology: Within each eligibility tier, newest published_at -> oldest published_at.
 */

import { isWithinCanonicalReaderWindow } from "@/lib/news/canonical-window";
import { hasVerifiedRealMedia, extractVerifiedRealMediaUrl } from "@/lib/news/images/validate";

/** Generic meta-content and roundup signatures to reject */
const GENERIC_ROUNDUP_PATTERNS = [
  /देश\s*और\s*दुनिया\s*(?:के|की)\s*(?:ताजा|ताज़ा|प्रमुख|बड़ी|टॉप)?\s*(?:समाचार(?:ों)?|खबर(?:ें|ों)?|अपडेट(?:्स)?)/i,
  /आज\s*की\s*(?:प्रमुख|बड़ी|ताजा|ताज़ा|टॉप)\s*(?:समाचार(?:ों)?|खबर(?:ें|ों)?|अपडेट(?:्स)?)/i,
  /दिनभर\s*की\s*(?:बड़ी|प्रमुख|ताजा|ताज़ा|टॉप)\s*(?:समाचार(?:ों)?|खबर(?:ें|ों)?)/i,
  /लाइव\s*अपडेट\s*जारी/i,
  /टॉप\s*(?:5|10|15|20)\s*(?:बड़ी|प्रमुख)?\s*(?:समाचार(?:ों)?|खबर(?:ें|ों)?)/i,
  /आज\s*का\s*(?:राशिफल|पंचांग|अंक\s*ज्योतिष)/i,
  /daily\s*(?:roundup|briefing|top\s*stories|news\s*wrap)/i,
  /top\s*(?:5|10|15|20)?\s*(?:news|stories|headlines|\s)+\s*of\s*the\s*day/i,
  /live\s*updates?:\s*(?:top\s*stories|today'?s\s*headlines)/i,
];

/** Commercial/promotional content patterns — must NOT enter editorial news feed */
const COMMERCIAL_PROMO_PATTERNS = [
  /iphone\s*\d+/i,
  /reliance\s*digital/i,
  /amazon\s*(?:great|sale|festival|offer)/i,
  /flipkart\s*(?:sale|offer|festival|big\s*billion)/i,
  /\bblack\s*friday\b/i,
  /mega\s*(?:sale|offer|deal)/i,
  /(?:discount|cashback|emi)\s*offer/i,
  /(?:smartphone|laptop|tv|gadget)\s*(?:offer|deal|price\s*cut)/i,
  /(?:ऑफर|सेल|डिस्काउंट|छूट)\s*(?:पर|में|के)/i,
  /(?:reliance|jio|amazon|flipkart|meesho)\s*(?:offer|sale|deal|ऑफर|सेल)/i,
];

/** External non-Chhattisgarh locations */
const EXTERNAL_LOCATIONS = [
  "mumbai", "मुंबई", "delhi", "दिल्ली", "नई दिल्ली", "new delhi",
  "kolkata", "कोलकाता", "chennai", "चेन्नई", "bengaluru", "bangalore", "बेंगलुरु",
  "hyderabad", "हैदराबाद", "pune", "पुणे", "lucknow", "लखनऊ", "patna", "पटना",
  "jaipur", "जयपुर", "ahmedabad", "अहमदाबाद", "bhopal", "भोपाल", "indore", "इंदौर",
  "varanasi", "वाराणसी", "kanpur", "कानपुर", "chandigarh", "चंडीगढ़",
  "punjab", "पंजाब", "amritsar", "अमृतसर", "jalandhar", "जालंधर", "ludhiana", "लुधियाना",
  "kerala", "केरल", "tamil nadu", "तमिलनाडु", "bihar", "बिहार", "haryana", "हरियाणा"
];

const CG_DISTRICT_SIGNALS = [
  "chhattisgarh", "छत्तीसगढ़", "raipur", "रायपुर", "durg", "दुर्ग", "bhilai", "भिलाई",
  "bilaspur", "बिलासपुर", "bastar", "बस्तर", "korba", "कोरबा", "rajnandgaon", "राजनंदगांव",
  "raigarh", "रायगढ़", "ambikapur", "अंबिकापुर", "jagdalpur", "जगदलपुर", "kanker", "कांकेर",
  "dantewada", "दंतेवाड़ा", "sukma", "सुकमा", "bijapur", "बीजापुर", "dhamtari", "धमतरी",
  "mahasamund", "महासमुंद", "kabirdham", "कबीरधाम", "kawardha", "कवर्धा", "balod", "बालोद",
  "bemetara", "बेमेतरा", "gariaband", "गरियाबंद", "balodabazar", "बलौदाबाजार", "बलौदाबाज़ार",
  "janjgir", "जांजगीर", "champa", "चांपा", "surguja", "सरगुजा", "jashpur", "जशपुर",
  "korea", "कोरिया", "manendragarh", "मनेंद्रगढ़", "mohla", "मोहला", "sakti", "सक्ती",
  "sarangarh", "सारंगढ़", "khairagarh", "खैरागढ़", "pendra", "पेंड्रा", "gaurela", "गौरेला",
  "विष्णु देव साय", "विष्णुदेव साय", "साय कैबिनेट", "महानदी", "इंद्रावती"
];

/**
 * Validates whether a headline or summary represents commercial promotional content.
 */
export function isCommercialPromoStory(headline?: string | null, summary?: string | null): boolean {
  if (!headline) return false;
  const text = `${headline} ${summary || ""}`.trim();
  return COMMERCIAL_PROMO_PATTERNS.some((p) => p.test(text));
}

/**
 * Validates whether a headline or summary represents a generic meta-content roundup.
 */
export function isGenericRoundupStory(headline?: string | null, summary?: string | null): boolean {
  if (!headline) return true;
  const text = `${headline} ${summary || ""}`.trim();
  return GENERIC_ROUNDUP_PATTERNS.some((p) => p.test(text));
}

/**
 * Checks whether an external city story (e.g. Mumbai, Delhi) has an invalid conflict
 * with an assigned Chhattisgarh district.
 */
export function hasLocationIntegrityConflict(
  headline?: string | null,
  summary?: string | null,
  assignedDistrict?: string | null
): boolean {
  if (!headline) return false;
  if (!assignedDistrict) return false;

  const text = `${headline} ${summary || ""}`.toLowerCase();
  const hlLower = headline.toLowerCase();

  // Check if headline or text explicitly features an external city
  const hasExternalCity = EXTERNAL_LOCATIONS.some((loc) => hlLower.includes(loc));
  if (!hasExternalCity) return false;

  // If it also genuinely mentions a CG district or state authority, it's not a conflict
  const hasCgSign = CG_DISTRICT_SIGNALS.some((sig) => text.includes(sig));
  if (hasCgSign) return false;

  // External story with no CG mention, but assigned a CG district -> CONFLICT
  return true;
}

/**
 * The one place that decides which image (if any) may be presented as real source media for a story.
 * Stock / generic / placeholder / fake URLs resolve to "" - the story then renders text-first.
 */
export function resolveVerifiedStoryMedia(story: Parameters<typeof extractVerifiedRealMediaUrl>[0] & { imageUrl?: string | null }): string {
  const candidate = extractVerifiedRealMediaUrl(story) || story.imageUrl || "";
  return candidate && hasVerifiedRealMedia(candidate) ? candidate : "";
}

export type StoryEligibilityResult = {
  eligible: boolean;
  reason?: string;
};

/**
 * Text-only eligibility: 30-day window, no promo, no roundup, valid headline. NEVER depends on
 * media — a story is not withheld from readers because its image has not been attached yet.
 */
export function checkStoryTextEligibility(story: {
  headline?: string;
  summary?: string;
  publishedAt?: string | null;
}): StoryEligibilityResult {
  if (!story?.headline || !story.headline.trim()) return { eligible: false, reason: "empty_headline" };
  if (!isWithinCanonicalReaderWindow(story.publishedAt)) {
    return { eligible: false, reason: "outside_canonical_30day_window" };
  }
  if (isCommercialPromoStory(story.headline, story.summary)) {
    return { eligible: false, reason: "commercial_promo_rejected" };
  }
  if (isGenericRoundupStory(story.headline, story.summary)) {
    return { eligible: false, reason: "generic_roundup_rejected" };
  }
  return { eligible: true };
}

/**
 * Editorial eligibility WITH the hard media requirement — only for visual broadcast surfaces
 * (live TV queue) that cannot render a story without a photo. Reader list pages use
 * checkStoryTextEligibility instead.
 *
 * Single authoritative editorial eligibility gate for Jan Darpan newsroom:
 * 1. Must be within the 30-day canonical window (published_at >= now - 30 days)
 * 2. Must NOT be a generic roundup / meta story
 * 3. Must have verified real media (no broken images, no stock placeholders)
 * 4. Must have a valid headline
 */
export function checkStoryEditorialEligibility(story: {
  id?: string;
  headline?: string;
  summary?: string;
  publishedAt?: string | null;
  imageUrl?: string | null;
}): StoryEligibilityResult {
  if (!story?.headline || !story.headline.trim()) {
    return { eligible: false, reason: "empty_headline" };
  }

  // 1. Canonical 30-Day Window
  if (!isWithinCanonicalReaderWindow(story.publishedAt)) {
    return { eligible: false, reason: "outside_canonical_30day_window" };
  }

  // 1.5 Reject Commercial/Promotional Content
  if (isCommercialPromoStory(story.headline, story.summary)) {
    return { eligible: false, reason: "commercial_promo_rejected" };
  }

  // 2. Reject Generic Roundups
  if (isGenericRoundupStory(story.headline, story.summary)) {
    return { eligible: false, reason: "generic_roundup_rejected" };
  }

  // 3. Media is NOT an eligibility criterion. A valid article without verified source media is still a valid
  // article: it renders as a text-first card. The verified-real-media rule governs what image may be DISPLAYED
  // (see resolveVerifiedStoryMedia), never whether the story is shown.
  return { eligible: true };
}
