/**
 * Location detection for Chhattisgarh hyperlocal editorial imagery
 */

export type DetectedLocation = {
  district: string | null;
  state: string | null;
  country: string;
  scope: "hyperlocal" | "state" | "national" | "international";
  matchedTerms: string[];
};

const CG_DISTRICTS: Record<string, string[]> = {
  raipur: ["raipur", "रायपुर", "capital city"],
  bilaspur: ["bilaspur", "बिलासपुर"],
  durg: ["durg", "दुर्ग", "bhilai", "भिलाई"],
  korba: ["korba", "कोरबा"],
  jagdalpur: ["jagdalpur", "जगदलपुर", "bastar", "बस्तर"],
  ambikapur: ["ambikapur", "अंबिकापुर", "surguja", "सरगुजा"],
  rajnandgaon: ["rajnandgaon", "राजनांदगांव"],
  dhamtari: ["dhamtari", "धमतरी"],
  mahasamund: ["mahasamund", "महासमुंद"],
  kanker: ["kanker", "कांकेर"],
  janjgir: ["janjgir", "जांजगीर", "champa", "चंपा"],
  kondagaon: ["kondagaon", "कोंडागांव"],
  kabeerdham: ["kabeerdham", "kawardha", "कबीरधाम", "कवर्धा"],
};

const INTERNATIONAL_MARKERS =
  /\b(global|international|world|foreign|abroad|usa|america|china|russia|uk|europe|middle east|gaza|ukraine|united nations|un\b)/i;

const NATIONAL_MARKERS =
  /\b(india|indian|delhi|mumbai|kolkata|chennai|bengaluru|bangalore|parliament|lok sabha|rajya sabha|supreme court|modi government|centre|central government|भारत|दिल्ली|संसद)\b/i;

const CG_STATE_MARKERS =
  /\b(chhattisgarh|chattisgarh|cg\b|छत्तीसगढ़|छत्तीसगढ)\b/i;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function detectEditorialLocation(input: {
  headline: string;
  summary?: string | null;
  body?: string | null;
  region?: string | null;
}): DetectedLocation {
  const combined = normalize(
    [input.headline, input.summary, input.body, input.region]
      .filter(Boolean)
      .join(" ")
  );

  const matchedTerms: string[] = [];
  let district: string | null = null;

  for (const [key, terms] of Object.entries(CG_DISTRICTS)) {
    for (const term of terms) {
      if (combined.includes(normalize(term))) {
        district = key;
        matchedTerms.push(term);
        break;
      }
    }
    if (district) break;
  }

  const isInternational = INTERNATIONAL_MARKERS.test(combined);
  const isNational = NATIONAL_MARKERS.test(combined);
  const isChhattisgarh =
    CG_STATE_MARKERS.test(combined) ||
    input.region?.toLowerCase() === "chhattisgarh" ||
    Boolean(district);

  if (isInternational && !isChhattisgarh) {
    return {
      district: null,
      state: null,
      country: "international",
      scope: "international",
      matchedTerms,
    };
  }

  if (district) {
    return {
      district,
      state: "chhattisgarh",
      country: "india",
      scope: "hyperlocal",
      matchedTerms,
    };
  }

  if (isChhattisgarh) {
    return {
      district: null,
      state: "chhattisgarh",
      country: "india",
      scope: "state",
      matchedTerms: matchedTerms.length ? matchedTerms : ["chhattisgarh"],
    };
  }

  if (isNational) {
    return {
      district: null,
      state: null,
      country: "india",
      scope: "national",
      matchedTerms,
    };
  }

  const region = input.region?.toLowerCase();
  if (region === "chhattisgarh") {
    return {
      district: null,
      state: "chhattisgarh",
      country: "india",
      scope: "state",
      matchedTerms: ["chhattisgarh"],
    };
  }

  return {
    district: null,
    state: region === "india" ? null : region ?? null,
    country: region === "global" ? "international" : "india",
    scope: region === "global" ? "international" : "national",
    matchedTerms,
  };
}

export function getDistrictVisualCues(district: string | null): string {
  if (!district) return "";

  const cues: Record<string, string> = {
    raipur:
      "Raipur civic skyline hints, Naya Raipur modern blocks, Mahanadi river curve, urban Chhattisgarh capital atmosphere",
    bilaspur:
      "Bilaspur railway hub symbolism, Arpa river motif, central Chhattisgarh plains",
    durg: "Bhilai steel plant abstract geometry, industrial Durg-Bhilai twin city energy",
    korba: "Korba power sector abstract, mining-industrial landscape hints",
    jagdalpur:
      "Bastar tribal art-inspired borders, dense sal forest silhouettes, southern CG tribal heritage",
    ambikapur:
      "Surguja highland hills, northern Chhattisgarh forested terrain",
    rajnandgaon: "Agricultural heartland, rural Chhattisgarh community symbols",
    dhamtari: "River-fed agricultural district, rural civic life",
    mahasamund: "Eastern CG rural landscape, community gathering symbolism",
    kanker: "Central Bastar transition zone, forest-community blend",
    janjgir: "Coalfield region abstract, eastern industrial corridor",
    kondagaon: "Bastar craft motifs, artisan community symbolism",
    kabeerdham: "Central highland district, forested rural Chhattisgarh",
  };

  return cues[district] ?? `${district} district Chhattisgarh regional authenticity`;
}
