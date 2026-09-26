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

export type GeographicScope = "local" | "statewide" | "national" | "international";

export type CanonicalDistrictResolution = {
  /** The 33-district slug if identified (e.g. "durg", "raipur", "bilaspur", "bastar") */
  districtSlug: string | null;
  /** Visible district name in English (e.g. "Durg", "Raipur", "Bilaspur") */
  nameEn: string | null;
  /** Visible district name in Hindi (e.g. "दुर्ग", "रायपुर", "बिलासपुर") */
  nameHi: string | null;
  /** Locality name in Hindi if identified (e.g. "भिलाई", "कुम्हारी", "महादेव घाट") */
  localityHi: string | null;
  /** Locality name in English if identified (e.g. "Bhilai", "Kumhari", "Mahadev Ghat") */
  localityEn: string | null;
  /** Primary locality identifier */
  locality: string | null;
  /** Geographic editorial scope */
  geographicScope: GeographicScope;
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

type KnownLocality = {
  slug: string;
  nameHi: string;
  nameEn: string;
  districtSlug: string;
  regex: RegExp;
};

const KNOWN_LOCALITIES: KnownLocality[] = [
  // Durg localities
  { slug: "bhilai", nameHi: "भिलाई", nameEn: "Bhilai", districtSlug: "durg", regex: /(?:bhilai|भिलाई)/i },
  { slug: "kumhari", nameHi: "कुम्हारी", nameEn: "Kumhari", districtSlug: "durg", regex: /(?:kumhari|कुम्हारी)/i },
  { slug: "mahadev-ghat", nameHi: "महादेव घाट", nameEn: "Mahadev Ghat", districtSlug: "durg", regex: /(?:mahadev\s*ghat|महादेव\s*घाट)/i },
  { slug: "patan", nameHi: "पाटन", nameEn: "Patan", districtSlug: "durg", regex: /(?:patan|पाटन)/i },
  { slug: "risali", nameHi: "रिसाली", nameEn: "Risali", districtSlug: "durg", regex: /(?:risali|रिसाली)/i },
  { slug: "jamul", nameHi: "जामुल", nameEn: "Jamul", districtSlug: "durg", regex: /(?:jamul|जामुल)/i },
  { slug: "anda", nameHi: "अंडा", nameEn: "Anda", districtSlug: "durg", regex: /(?:anda|अंडा)/i },
  { slug: "mahuadanr", nameHi: "महुआडांड़", nameEn: "Mahuadanr", districtSlug: "durg", regex: /(?:mahuadanr|mahuatand|महुआडांड़|महुआटांड़)/i },

  // Raipur localities
  { slug: "naya-raipur", nameHi: "नया रायपुर", nameEn: "Naya Raipur", districtSlug: "raipur", regex: /(?:naya\s*raipur|नया\s*रायपुर|atal\s*nagar|अटल\s*नगर)/i },
  { slug: "abhanpur", nameHi: "अभनपुर", nameEn: "Abhanpur", districtSlug: "raipur", regex: /(?:abhanpur|अभनपुर)/i },
  { slug: "arang", nameHi: "आरंग", nameEn: "Arang", districtSlug: "raipur", regex: /(?:arang|आरंग)/i },
  { slug: "tilda", nameHi: "तिल्दा", nameEn: "Tilda", districtSlug: "raipur", regex: /(?:tilda|तिल्दा)/i },
  { slug: "mandir-hasaud", nameHi: "मंदिर हसौद", nameEn: "Mandir Hasaud", districtSlug: "raipur", regex: /(?:mandir\s*hasaud|मंदिर\s*हसौद)/i },
  { slug: "pandri", nameHi: "पंडरी", nameEn: "Pandri", districtSlug: "raipur", regex: /(?:pandri|पंडरी)/i },
  { slug: "telibandha", nameHi: "तेलीबांधा", nameEn: "Telibandha", districtSlug: "raipur", regex: /(?:telibandha|तेलीबांधा)/i },
  { slug: "birgaon", nameHi: "बीरगांव", nameEn: "Birgaon", districtSlug: "raipur", regex: /(?:birgaon|बीरगांव)/i },

  // Bilaspur localities
  { slug: "kota", nameHi: "कोटा", nameEn: "Kota", districtSlug: "bilaspur", regex: /(?:kota|कोटा)/i },
  { slug: "ratanpur", nameHi: "रतनपुर", nameEn: "Ratanpur", districtSlug: "bilaspur", regex: /(?:ratanpur|रतनपुर)/i },
  { slug: "takhatpur", nameHi: "तखतपुर", nameEn: "Takhatpur", districtSlug: "bilaspur", regex: /(?:takhatpur|तखतपुर)/i },
  { slug: "bodri", nameHi: "बोदरी", nameEn: "Bodri", districtSlug: "bilaspur", regex: /(?:bodri|बोदरी)/i },
  { slug: "bilha", nameHi: "बिल्हा", nameEn: "Bilha", districtSlug: "bilaspur", regex: /(?:bilha|बिल्हा)/i },
  { slug: "masturi", nameHi: "मस्तूरी", nameEn: "Masturi", districtSlug: "bilaspur", regex: /(?:masturi|मस्तूरी)/i },

  // Rajnandgaon localities
  { slug: "dongargarh", nameHi: "डोंगरगढ़", nameEn: "Dongargarh", districtSlug: "rajnandgaon", regex: /(?:dongargarh|डोंगरगढ़)/i },
  { slug: "dongargaon", nameHi: "डोंगरगांव", nameEn: "Dongargaon", districtSlug: "rajnandgaon", regex: /(?:dongargaon|डोंगरगांव)/i },
  { slug: "chhuria", nameHi: "छुरिया", nameEn: "Chhuria", districtSlug: "rajnandgaon", regex: /(?:chhuria|छुरिया)/i },

  // Surguja localities
  { slug: "ambikapur", nameHi: "अंबिकापुर", nameEn: "Ambikapur", districtSlug: "surguja", regex: /(?:ambikapur|अंबिकापुर)/i },
  { slug: "mainpat", nameHi: "मैनपाट", nameEn: "Mainpat", districtSlug: "surguja", regex: /(?:mainpat|मैनपाट)/i },
  { slug: "sitapur", nameHi: "सीतापुर", nameEn: "Sitapur", districtSlug: "surguja", regex: /(?:sitapur|सीतापुर)/i },

  // Bastar localities
  { slug: "jagdalpur", nameHi: "जगदलपुर", nameEn: "Jagdalpur", districtSlug: "bastar", regex: /(?:jagdalpur|जगदलपुर)/i },

  // Kabirdham localities
  { slug: "chandalpur", nameHi: "चांदलपुर", nameEn: "Chandalpur", districtSlug: "kabirdham", regex: /(?:chandalpur|चांदलपुर)/i },
  { slug: "kawardha", nameHi: "कवर्धा", nameEn: "Kawardha", districtSlug: "kabirdham", regex: /(?:kawardha|कवर्धा)/i },

  // Mahasamund localities
  { slug: "saraipali", nameHi: "सरायपाली", nameEn: "Saraipali", districtSlug: "mahasamund", regex: /(?:saraipali|सरायपाली)/i },
  { slug: "basna", nameHi: "बसना", nameEn: "Basna", districtSlug: "mahasamund", regex: /(?:basna|बसना)/i },
  { slug: "pithora", nameHi: "पिथौरा", nameEn: "Pithora", districtSlug: "mahasamund", regex: /(?:pithora|पिथौरा)/i },
  { slug: "bagbahara", nameHi: "बागबाहरा", nameEn: "Bagbahara", districtSlug: "mahasamund", regex: /(?:bagbahara|बागबाहरा)/i },
];

function detectLocality(text: string, currentDistrictSlug?: string | null): KnownLocality | null {
  for (const loc of KNOWN_LOCALITIES) {
    if (loc.regex.test(text)) {
      if (!currentDistrictSlug || loc.districtSlug === currentDistrictSlug) {
        return loc;
      }
    }
  }
  return null;
}

const INTERNATIONAL_SIGNALS = [
  "united nations", "un ", "un security", "houthis", "mecca", "saudi arabia", "turkey",
  "pakistan", "shehbaz sharif", "ukraine", "russia", "lavrov", "putin", "moscow",
  "australia", "openai", "red sox", "cubs", "baseball", "itv", "emmerdale",
  "israel", "gaza", "lebanon", "hezbollah", "iran", "biden", "trump", "white house",
  "अंतरराष्ट्रीय", "विदेश", "पाकिस्तान", "रूस", "यूक्रेन", "सऊदी", "संयुक्त राष्ट्र"
];

const NATIONAL_SIGNALS = [
  "delhi", "mumbai", "kolkata", "parliament", "lok sabha", "rajya sabha", "modi",
  "union cabinet", "central government", "national", "jodhpur", "air force", "iaf",
  "exercise tarang shakti", "karnataka", "shivakumar", "bjp national", "congress national",
  "supreme court", "high court", "rbi", "sebi", "upi", "no upi day", "vyapar mandal",
  "reliance digital", "iphone", "apple", "asian games", "squash", "bcci", "cricket india",
  "संसद", "सुप्रीम कोर्ट", "केंद्र सरकार", "प्रधानमंत्री", "मोदी", "भारतीय वायु सेना",
  "जोधपुर", "तरंग शक्ति", "कर्नाटक", "डीके शिवकुमार", "नो यूपीआई डे", "व्यापारी",
  "एशियन गेम्स", "अनाहत सिंह", "अभय सिंह"
];

function detectGeographicScope(
  text: string,
  districtSlug: string | null,
  tags: string[],
  section?: string | null
): GeographicScope {
  if (districtSlug) return "local";

  const lower = text.toLowerCase();
  const allTags = tags.map((t) => t.toLowerCase());

  if (
    allTags.includes("world") ||
    allTags.includes("international") ||
    INTERNATIONAL_SIGNALS.some((sig) => lower.includes(sig) || text.includes(sig))
  ) {
    return "international";
  }

  if (
    allTags.includes("national") ||
    allTags.includes("india") ||
    NATIONAL_SIGNALS.some((sig) => lower.includes(sig) || text.includes(sig))
  ) {
    return "national";
  }

  if (
    allTags.includes("chhattisgarh") ||
    allTags.includes("raipur") ||
    section === "chhattisgarh" ||
    /छत्तीसगढ़|chhattisgarh/i.test(text)
  ) {
    return "statewide";
  }

  return "national";
}

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

  const combinedText = `${headline} ${summary || ""} ${body || ""}`;

  // Helper to package a district resolution with locality and scope
  const packageDistrict = (d: CgDistrict): CanonicalDistrictResolution => {
    const loc = detectLocality(combinedText, d.slug);
    return {
      districtSlug: d.slug,
      nameEn: d.name,
      nameHi: d.nameHi,
      localityHi: loc ? loc.nameHi : null,
      localityEn: loc ? loc.nameEn : null,
      locality: loc ? loc.nameEn : null,
      geographicScope: "local",
      isStatewide: false,
      displayTagHi: loc ? `${d.nameHi} (${loc.nameHi})` : d.nameHi,
      displayTagEn: loc ? `${d.name} (${loc.nameEn})` : d.name,
    };
  };

  // 1. Explicit district metadata (from DB / CMS / props)
  if (explicitDistrict && !isInvalidDistrict(explicitDistrict)) {
    const d = getDistrict(explicitDistrict);
    if (d) return packageDistrict(d);
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
      if (d) return packageDistrict(d);
    }
  }

  // 3. Tags (district:<slug> or explicit district name/alias tag)
  if (Array.isArray(tags)) {
    for (const rawTag of tags) {
      if (!rawTag) continue;
      const clean = rawTag.replace(/^district:/i, "").trim().toLowerCase();
      if (!isInvalidDistrict(clean)) {
        const d = getDistrict(clean);
        if (d) return packageDistrict(d);
      }
    }
  }

  // 4. Headline / summary text extraction via tagGeoFromContent
  const classified = tagGeoFromContent({
    title: headline,
    body: summary || body,
  });

  if (classified.primary_district && !isInvalidDistrict(classified.primary_district)) {
    const d = getDistrict(classified.primary_district);
    if (d) return packageDistrict(d);
  }

  if (Array.isArray(classified.districts) && classified.districts.length > 0) {
    const validSlug = classified.districts.find((s) => !isInvalidDistrict(s));
    if (validSlug) {
      const d = getDistrict(validSlug);
      if (d) return packageDistrict(d);
    }
  }

  // 5. Deep alias scanning on headline first, then summary/body
  const scanForDistrict = (text: string): CgDistrict | null => {
    const lower = text.toLowerCase();
    for (const d of CG_DISTRICTS) {
      if (lower.includes(d.name.toLowerCase()) || text.includes(d.nameHi)) {
        return d;
      }
      for (const alias of d.aliases) {
        const aLower = alias.toLowerCase();
        if (aLower === "capital" || aLower === "cg" || aLower === "bsp") continue;
        if (aLower === "kota" || aLower === "कोटा") {
          if (/औसत\s+कोटा|बारिश\s+का\s+कोटा|वर्षा\s+का\s+कोटा|कोटा\s+पूरा|आरक्षण\s+कोटा|गेहूं\s+का\s+कोटा/i.test(text)) {
            continue;
          }
        }
        if (lower.includes(aLower) || text.includes(alias)) {
          return d;
        }
      }
    }
    return null;
  };

  const fromHeadline = scanForDistrict(headline);
  if (fromHeadline) return packageDistrict(fromHeadline);

  const fromBody = scanForDistrict(`${summary || ""} ${body || ""}`);
  if (fromBody) return packageDistrict(fromBody);

  // 6. Check locality even if district name wasn't explicit (e.g. "भिलाई में..." implies Durg)
  const locDirect = detectLocality(combinedText);
  if (locDirect) {
    const d = getDistrict(locDirect.districtSlug);
    if (d) return packageDistrict(d);
  }

  // 7. Non-local scope resolution: statewide, national, international
  const scope = detectGeographicScope(combinedText, null, tags, section);
  const isStatewide = scope === "statewide";

  // Determine fallback desk tag without ever displaying "Chhattisgarh" as a district
  let fallbackDeskHi = "राज्य डेस्क";
  let fallbackDeskEn = "State Desk";

  if (scope === "international") {
    fallbackDeskHi = "विदेश डेस्क";
    fallbackDeskEn = "World Desk";
  } else if (scope === "national") {
    fallbackDeskHi = "राष्ट्रीय डेस्क";
    fallbackDeskEn = "National Desk";
  } else {
    fallbackDeskHi =
      categoryLabel && categoryLabel !== "छत्तीसगढ़"
        ? categoryLabel
        : section && section !== "chhattisgarh"
        ? section
        : "राज्य डेस्क";
    fallbackDeskEn =
      categoryLabel && categoryLabel.toLowerCase() !== "chhattisgarh"
        ? categoryLabel
        : section && section !== "chhattisgarh"
        ? section
        : "State Desk";
  }

  return {
    districtSlug: null,
    nameEn: null,
    nameHi: null,
    localityHi: null,
    localityEn: null,
    locality: null,
    geographicScope: scope,
    isStatewide,
    displayTagHi: fallbackDeskHi,
    displayTagEn: fallbackDeskEn,
  };
}
