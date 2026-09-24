/**
 * Canonical Story District Classification Engine
 *
 * Implements Jan Darpan's district-first newsroom taxonomy:
 * 1. Resolves canonical district across 33 official Chhattisgarh districts.
 * 2. Maps cities/towns/blocks to their parent district (e.g. Bhilai → Durg, Ambikapur → Surguja, Jagdalpur → Bastar).
 * 3. Never outputs "Chhattisgarh" / "छत्तीसगढ़" as a visible district tag.
 * 4. Genuinely statewide news is classified as `isStatewide: true` with a clean desk tag ("राज्य डेस्क" / "State Desk").
 */

import { CG_DISTRICTS, getDistrict, type CgDistrict } from "./districts";
import { tagGeoFromContent } from "./geo-tagging";

export type CanonicalDistrictResolution = {
  /** The 33-district slug if identified (e.g. "durg", "raipur", "bilaspur", "bastar") */
  districtSlug: string | null;
  /** Visible district name in English (e.g. "Durg", "Raipur", "Bilaspur") */
  nameEn: string | null;
  /** Visible district name in Hindi (e.g. "दुर्ग", "रायपुर", "बिलासपुर") */
  nameHi: string | null;
  /** Whether this story is classified as statewide */
  isStatewide: boolean;
  /** Canonical visible display tag in Hindi */
  displayTagHi: string;
  /** Canonical visible display tag in English */
  displayTagEn: string;
};

export type StoryDistrictInput = {
  explicitDistrict?: string | null;
  geo_metadata?: unknown;
  tags?: string[];
  headline?: string;
  summary?: string | null;
  body?: string | null;
  section?: string | null;
  categoryLabel?: string | null;
};

// Words that indicate statewide policy, governance, or institutions
const STATEWIDE_SIGNALS = [
  "मंत्रालय",
  "विधानसभा",
  "विधान सभा",
  "कैबिनेट",
  "साय कैबिनेट",
  "विष्णु देव साय",
  "विष्णुदेव साय",
  "मुख्यमंत्री",
  "राज्य सरकार",
  "छत्तीसगढ़ सरकार",
  "33 जिलों",
  "33 कलेक्टरों",
  "राज्यभर",
  "प्रदेशभर",
  "state government",
  "chief minister",
  "cabinet",
  "vidhan sabha",
];

export function resolveCanonicalStoryDistrict(
  input: StoryDistrictInput
): CanonicalDistrictResolution {
  const {
    explicitDistrict,
    geo_metadata,
    tags = [],
    headline = "",
    summary = "",
    body = "",
    section,
    categoryLabel,
  } = input;

  const isInvalidDistrict = (str: string | null | undefined): boolean => {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    return s === "chhattisgarh" || s === "छत्तीसगढ़" || s === "statewide" || s === "cg" || s === "unknown";
  };

  // 1. Explicit district metadata (from DB / CMS / props)
  if (explicitDistrict && !isInvalidDistrict(explicitDistrict)) {
    const d = getDistrict(explicitDistrict);
    if (d) {
      return {
        districtSlug: d.slug,
        nameEn: d.name,
        nameHi: d.nameHi,
        isStatewide: false,
        displayTagHi: d.nameHi,
        displayTagEn: d.name,
      };
    }
  }

  // 2. geo_metadata (primary_district or districts array)
  if (geo_metadata && typeof geo_metadata === "object") {
    const gm = geo_metadata as {
      primary_district?: string | null;
      districts?: string[];
      districtSlug?: string | null;
      district?: string | null;
    };
    const geoCandidate =
      gm.primary_district ||
      (Array.isArray(gm.districts) && gm.districts.find((s) => !isInvalidDistrict(s))) ||
      gm.districtSlug ||
      gm.district;

    if (geoCandidate && !isInvalidDistrict(geoCandidate)) {
      const d = getDistrict(geoCandidate);
      if (d) {
        return {
          districtSlug: d.slug,
          nameEn: d.name,
          nameHi: d.nameHi,
          isStatewide: false,
          displayTagHi: d.nameHi,
          displayTagEn: d.name,
        };
      }
    }
  }

  // 3. Tags (district:<slug> or explicit district name/alias tag)
  if (Array.isArray(tags)) {
    for (const rawTag of tags) {
      if (!rawTag) continue;
      const clean = rawTag.replace(/^district:/i, "").trim().toLowerCase();
      if (!isInvalidDistrict(clean)) {
        const d = getDistrict(clean);
        if (d) {
          return {
            districtSlug: d.slug,
            nameEn: d.name,
            nameHi: d.nameHi,
            isStatewide: false,
            displayTagHi: d.nameHi,
            displayTagEn: d.name,
          };
        }
      }
    }
  }

  // 4. Headline / summary text extraction via tagGeoFromContent
  const combinedText = `${headline} ${summary || ""} ${body || ""}`;
  const classified = tagGeoFromContent({
    title: headline,
    body: summary || body,
  });

  if (classified.primary_district && !isInvalidDistrict(classified.primary_district)) {
    const d = getDistrict(classified.primary_district);
    if (d) {
      return {
        districtSlug: d.slug,
        nameEn: d.name,
        nameHi: d.nameHi,
        isStatewide: false,
        displayTagHi: d.nameHi,
        displayTagEn: d.name,
      };
    }
  }

  if (Array.isArray(classified.districts) && classified.districts.length > 0) {
    const validSlug = classified.districts.find((s) => !isInvalidDistrict(s));
    if (validSlug) {
      const d = getDistrict(validSlug);
      if (d) {
        return {
          districtSlug: d.slug,
          nameEn: d.name,
          nameHi: d.nameHi,
          isStatewide: false,
          displayTagHi: d.nameHi,
          displayTagEn: d.name,
        };
      }
    }
  }

  // 5. Deep alias scanning on headline first, then summary/body
  // Priority order: headline city/district hits take precedence over body hits
  const scanForDistrict = (text: string): CgDistrict | null => {
    const lower = text.toLowerCase();
    for (const d of CG_DISTRICTS) {
      // Check official names
      if (lower.includes(d.name.toLowerCase()) || text.includes(d.nameHi)) {
        return d;
      }
      // Check city and block aliases (e.g. Bhilai, Ambikapur, Jagdalpur, Kawardha, etc.)
      for (const alias of d.aliases) {
        const aLower = alias.toLowerCase();
        if (aLower === "capital" || aLower === "cg" || aLower === "bsp") continue;
        if (lower.includes(aLower) || text.includes(alias)) {
          return d;
        }
      }
    }
    return null;
  };

  const fromHeadline = scanForDistrict(headline);
  if (fromHeadline) {
    return {
      districtSlug: fromHeadline.slug,
      nameEn: fromHeadline.name,
      nameHi: fromHeadline.nameHi,
      isStatewide: false,
      displayTagHi: fromHeadline.nameHi,
      displayTagEn: fromHeadline.name,
    };
  }

  const fromBody = scanForDistrict(`${summary || ""} ${body || ""}`);
  if (fromBody) {
    return {
      districtSlug: fromBody.slug,
      nameEn: fromBody.name,
      nameHi: fromBody.nameHi,
      isStatewide: false,
      displayTagHi: fromBody.nameHi,
      displayTagEn: fromBody.name,
    };
  }

  // 6. Statewide classification
  const lowerAll = combinedText.toLowerCase();
  const isStatewide =
    classified.classification_kind === "statewide" ||
    STATEWIDE_SIGNALS.some((sig) => lowerAll.includes(sig.toLowerCase()) || combinedText.includes(sig));

  // Determine fallback desk tag without ever displaying "Chhattisgarh" as a district
  const fallbackDeskHi =
    categoryLabel && categoryLabel !== "छत्तीसगढ़"
      ? categoryLabel
      : section && section !== "chhattisgarh"
      ? section
      : "राज्य डेस्क";

  const fallbackDeskEn =
    categoryLabel && categoryLabel.toLowerCase() !== "chhattisgarh"
      ? categoryLabel
      : section && section !== "chhattisgarh"
      ? section
      : "State Desk";

  return {
    districtSlug: null,
    nameEn: null,
    nameHi: null,
    isStatewide: true,
    displayTagHi: fallbackDeskHi,
    displayTagEn: fallbackDeskEn,
  };
}
