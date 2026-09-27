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

/** External non-Chhattisgarh locations */
const EXTERNAL_LOCATIONS = [
  "mumbai", "मुंबई", "delhi", "दिल्ली", "नई दिल्ली", "new delhi",
  "kolkata", "कोलकाता", "chennai", "चेन्नई", "bengaluru", "bangalore", "बेंगलुरु",
  "hyderabad", "हैदराबाद", "pune", "पुणे", "lucknow", "लखनऊ", "patna", "पटना",
  "jaipur", "जयपुर", "ahmedabad", "अहमदाबाद", "bhopal", "भोपाल", "indore", "इंदौर",
  "varanasi", "वाराणसी", "kanpur", "कानपुर", "chandigarh", "चंडीगढ़"
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

export type StoryEligibilityResult = {
  eligible: boolean;
  reason?: string;
};

/**
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

  // 2. Reject Generic Roundups
  if (isGenericRoundupStory(story.headline, story.summary)) {
    return { eligible: false, reason: "generic_roundup_rejected" };
  }

  // 3. Hard Media Quality Gate
  const mediaUrl = extractVerifiedRealMediaUrl(story) || story.imageUrl;
  if (!hasVerifiedRealMedia(mediaUrl)) {
    return { eligible: false, reason: "invalid_or_missing_media" };
  }

  return { eligible: true };
}
