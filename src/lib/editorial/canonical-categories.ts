/**
 * Jan Darpan Canonical Category Taxonomy & Classification Engine
 *
 * Implements the canonical taxonomy:
 * - all: "सभी" / "All"
 * - crime: "क्राइम" / "Crime"
 * - politics: "राजनीति" / "Politics"
 * - national: "राष्ट्रीय" / "National"
 * - chhattisgarh: "छत्तीसगढ़" / "Chhattisgarh"
 * - business: "बाज़ार" / "Market/Business"
 * - governance: "प्रशासन" / "Governance/Administration"
 * - sports: "खेल" / "Sports"
 * - health: "स्वास्थ्य" / "Health"
 * - education: "शिक्षा" / "Education"
 *
 * Supports multiple canonical category tags per article (e.g. राजनीति + छत्तीसगढ़ + प्रशासन).
 * Semantic & contextual classification: examines headline, summary, content, location, entities, source, tags.
 * Deterministic and auditable with confidence and reasoning.
 */

export type CanonicalCategoryId =
  | "all"
  | "crime"
  | "politics"
  | "national"
  | "chhattisgarh"
  | "business"
  | "governance"
  | "sports"
  | "health"
  | "education";

export type CanonicalCategoryDefinition = {
  id: CanonicalCategoryId;
  labelHi: string;
  labelEn: string;
  descriptionHi: string;
  descriptionEn: string;
};

export const CANONICAL_TAXONOMY: CanonicalCategoryDefinition[] = [
  {
    id: "all",
    labelHi: "सभी",
    labelEn: "All",
    descriptionHi: "सभी सत्यापित समाचार",
    descriptionEn: "All verified stories",
  },
  {
    id: "crime",
    labelHi: "क्राइम",
    labelEn: "Crime",
    descriptionHi: "अपराध, पुलिस कार्रवाई, न्याय व सुरक्षा",
    descriptionEn: "Crime, police operations, investigations, and law enforcement",
  },
  {
    id: "politics",
    labelHi: "राजनीति",
    labelEn: "Politics",
    descriptionHi: "राजनीतिक दल, चुनाव, सरकार व विधानसभा",
    descriptionEn: "Political parties, elections, governance, and assembly developments",
  },
  {
    id: "national",
    labelHi: "राष्ट्रीय",
    labelEn: "National",
    descriptionHi: "देशभर के प्रमुख राष्ट्रीय मुद्दे व केंद्र सरकार",
    descriptionEn: "National news, Union government, Supreme Court, and interstate affairs",
  },
  {
    id: "chhattisgarh",
    labelHi: "छत्तीसगढ़",
    labelEn: "Chhattisgarh",
    descriptionHi: "छत्तीसगढ़ राज्य व 33 जिलों की प्रमुख खबरें",
    descriptionEn: "Chhattisgarh state coverage across all 33 districts",
  },
  {
    id: "business",
    labelHi: "बाज़ार",
    labelEn: "Market",
    descriptionHi: "व्यापार, अर्थव्यवस्था, मंडी भाव व उद्योग",
    descriptionEn: "Business, markets, economy, mandi rates, and trade",
  },
  {
    id: "governance",
    labelHi: "प्रशासन",
    labelEn: "Governance",
    descriptionHi: "प्रशासनिक आदेश, निगम, नीतियां व जनसेवा",
    descriptionEn: "Public administration, collector orders, civic bodies, and public advisories",
  },
  {
    id: "health",
    labelHi: "स्वास्थ्य",
    labelEn: "Health",
    descriptionHi: "स्वास्थ्य सेवाएं, अस्पताल व चिकित्सा",
    descriptionEn: "Healthcare, hospitals, medical updates",
  },
  {
    id: "education",
    labelHi: "शिक्षा",
    labelEn: "Education",
    descriptionHi: "स्कूल, कॉलेज, परीक्षाएं व रोजगार",
    descriptionEn: "Education, universities, examinations, and jobs",
  },
  {
    id: "sports",
    labelHi: "खेल",
    labelEn: "Sports",
    descriptionHi: "खेलकूद, टूर्नामेंट व खिलाड़ी",
    descriptionEn: "Sports, tournaments, and athletics",
  },
];

export type CategoryResolutionInput = {
  headline?: string | null;
  summary?: string | null;
  body?: string | null;
  content?: string | null;
  section?: string | null;
  tags?: string[] | null;
  district?: string | null;
  districtSlug?: string | null;
  categoryLabel?: string | null;
  editorial_metadata?: unknown;
};

export type CategoryResolutionResult = {
  /** All canonical category tags this article legitimately belongs to */
  categories: CanonicalCategoryId[];
  /** Primary dominant category */
  primaryCategory: CanonicalCategoryId;
  /** Audit reasons explaining why each category was assigned */
  auditReasons: Record<string, string[]>;
  /** Confidence score between 0 and 1 */
  confidence: number;
};

// Semantic keywords & concepts for each category
const CRIME_SIGNALS = [
  "गिरफ्तार", "हिरासत", "पुलिस", "थाना", "कोतवाली", "क्राइम", "अपराध",
  "गांजा", "तस्कर", "तस्करी", "जब्त", "सट्टा", "महादेव सट्टा", "cbi", "acb",
  "रिश्वत", "रंगे हाथों", "अवैध हथियार", "हथियार फैक्ट्री", "मुठभेड़", "नक्सली डंप",
  "डंप ध्वस्त", "हत्या", "चोरी", "डकैती", "धोखाधड़ी", "फर्जीवाड़ा", "वारदात",
  "कोर्ट", "जमानत", "रिमांड", "fir", "धारा", "ड्रग्स", "स्मैक", "शराब भट्ठी",
  "arrest", "police", "contraband", "raid", "bribe", "fraud", "court"
];

const POLITICS_SIGNALS = [
  "राजनीति", "चुनाव", "उपचुनाव", "विधानसभा", "सत्र", "विपक्ष", "पक्ष-विपक्ष",
  "कांग्रेस", "भाजपा", "bjp", "inc", "आप", "आम आदमी पार्टी", "सांसद", "विधायक",
  "फूलो देवी नेताम", "विष्णु देव साय", "विष्णुदेव साय", "भूपेश बघेल", "टी एस सिंहदेव",
  "रमन सिंह", "दीपक बैज", "अरुण साव", "विजय शर्मा", "मंत्रालय", "मंत्री परिषद",
  "प्रत्याशी", "टिकट", "वोट", "मतदान", "पार्टी", "प्रदेशाध्यक्ष", "राष्ट्रीय अध्यक्ष",
  "politics", "election", "mla", "mp", "minister", "cabinet"
];

const GOVERNANCE_SIGNALS = [
  "प्रशासन", "कलेक्टर", "जिलाधीश", "नगर निगम", "महापौर", "कमिश्नर", "आयुक्त",
  "प्रशासनिक", "आदेश जारी", "अधिसूचना", "यातायात एडवाइजरी", "ट्रैफिक डायवर्ट",
  "जलभराव", "राहत कार्य", "एसडीएम", "तहसीलदार", "पटवारी", "स्वास्थ्य विभाग",
  "लोक निर्माण", "पीडब्ल्यूडी", "योजना", "स्टाइपेंड", "मानदेय", "वेतन वृद्धि",
  "निरीक्षण", "समीक्षा बैठक", "शासकीय", "सरकारी आदेश", "शासन ने", "राजपत्र",
  "administration", "collector", "municipal", "advisory", "official order", "governance"
];

const BUSINESS_SIGNALS = [
  "बाज़ार", "कारोबार", "व्यापार", "मंडी", "भाव", "दाम", "कीमत", "सोना", "चांदी",
  "पेट्रोल", "डीजल", "शेयर बाज़ार", "सेंसेक्स", "निफ्टी", "उद्योग", "उद्योगपति",
  "कारखाना", "स्टील प्लांट", "भिलाई स्टील", "secl", "nmdc", "cspdcl", "बिजली बिल",
  "जीएसटी", "राजस्व", "बजट", "सोलर", "दूर्ग सोलर", "बैंक", "ऋण", "लोन",
  "business", "market", "economy", "trade", "industry", "finance"
];

const NATIONAL_SIGNALS = [
  "राष्ट्रीय", "देशभर", "भारत सरकार", "केंद्र सरकार", "प्रधानमंत्री", "मोदी",
  "राष्ट्रपति", "सुप्रीम कोर्ट", "सर्वोच्च न्यायालय", "संसद", "लोकसभा", "राज्यसभा",
  "केंद्रीय मंत्री", "गृह मंत्रालय", "वित्त मंत्रालय", "रक्षा मंत्रालय", "सेना",
  "राष्ट्रीय राजमार्ग", "nhai", "रेलवे", "रेल मंत्रालय", "अंतरराज्यीय",
  "national", "india", "supreme court", "parliament", "central government"
];

const HEALTH_SIGNALS = [
  "स्वास्थ्य", "अस्पताल", "डॉक्टर", "एमबीबीएस", "इंटर्न्स", "स्टाइपेंड", "चिकित्सा",
  "दवा", "मरीज", "इलाज", "स्वास्थ्य विभाग", "एम्स", "मेडिकल कॉलेज", "संक्रमण",
  "health", "hospital", "medical", "doctor"
];

const EDUCATION_SIGNALS = [
  "शिक्षा", "स्कूल", "कॉलेज", "विश्वविद्यालय", "छात्र", "छात्राएं", "परीक्षा",
  "रिजल्ट", "एडमिशन", "शिक्षक", "प्राध्यापक", "cbse", "cgboard", "बोर्ड परीक्षा",
  "education", "school", "university", "student", "exam"
];

const SPORTS_SIGNALS = [
  "खेल", "खिलाड़ी", "क्रिकेट", "टूर्नामेंट", "मैच", "पदक", "गोल्ड", "सिल्वर",
  "ओलंपिक", "स्टेडियम", "प्रतियोगिता", "sports", "cricket", "tournament"
];

const CHHATTISGARH_DISTRICT_SIGNALS = [
  "छत्तीसगढ़", "chhattisgarh", "रायपुर", "raipur", "दुर्ग", "durg", "भिलाई", "bhilai",
  "बिलासपुर", "bilaspur", "बस्तर", "bastar", "कोरबा", "korba", "राजनंदगांव", "rajnandgaon",
  "रायगढ़", "raigarh", "अंबिकापुर", "ambikapur", "जगदलपुर", "jagdalpur", "कांकेर", "kanker",
  "दंतेवाड़ा", "dantewada", "सुकमा", "sukma", "बीजापुर", "bijapur", "धमतरी", "dhamtari",
  "महासमुंद", "mahasamund", "कबीरधाम", "kabirdham", "कवर्धा", "kawardha", "बालोद", "balod",
  "बेमेतरा", "bemetara", "गरियाबंद", "gariaband", "बलौदाबाजार", "balodabazar", "जांजगीर",
  "चांपा", "सरगुजा", "surguja", "जशपुर", "jashpur", "कोरिया", "korea", "मनेंद्रगढ़", "मोहला",
  "सक्ती", "सारंगढ़", "खैरागढ़", "पेंड्रा", "गौरेला", "साय कैबिनेट", "महानदी", "हसदेव"
];

/**
 * Resolves all canonical categories for a given news story.
 * Ensures every story has at least one category, supports multiple categories,
 * and maintains an auditable reasoning trail.
 */
export function resolveCanonicalCategories(
  input: CategoryResolutionInput
): CategoryResolutionResult {
  const headline = (input.headline || "").toLowerCase();
  const summary = (input.summary || "").toLowerCase();
  const body = (input.body || input.content || "").toLowerCase();
  const fullText = `${headline} ${summary} ${body}`;

  const explicitTags = (input.tags || []).map((t) => t.toLowerCase());
  const explicitSection = (input.section || "").toLowerCase();
  const explicitCategory = (input.categoryLabel || "").toLowerCase();

  const auditReasons: Record<string, string[]> = {};
  const matchedCategories = new Set<CanonicalCategoryId>();

  const checkCategory = (
    catId: CanonicalCategoryId,
    signals: string[],
    explicitKeys: string[]
  ) => {
    const reasons: string[] = [];

    // 1. Explicit metadata match (tags, section, categoryLabel)
    for (const key of explicitKeys) {
      if (explicitTags.includes(key) || explicitSection === key || explicitCategory.includes(key)) {
        reasons.push(`Explicit metadata tag/section: '${key}'`);
        break;
      }
    }

    // 2. Headline strong semantic match (weight: 2)
    const hlMatches = signals.filter((sig) => headline.includes(sig));
    if (hlMatches.length > 0) {
      reasons.push(`Headline matches: [${hlMatches.slice(0, 3).join(", ")}]`);
    }

    // 3. Body & summary match (weight: 1)
    const bodyMatches = signals.filter((sig) => fullText.includes(sig));
    if (bodyMatches.length >= 2 && hlMatches.length === 0) {
      reasons.push(`Content context matches: [${bodyMatches.slice(0, 3).join(", ")}]`);
    }

    if (reasons.length > 0) {
      matchedCategories.add(catId);
      auditReasons[catId] = reasons;
    }
  };

  // Evaluate each canonical category
  checkCategory("crime", CRIME_SIGNALS, ["crime", "police", "अपराध", "क्राइम"]);
  checkCategory("politics", POLITICS_SIGNALS, ["politics", "political", "राजनीति"]);
  checkCategory("governance", GOVERNANCE_SIGNALS, ["governance", "administration", "civic", "प्रशासन"]);
  checkCategory("business", BUSINESS_SIGNALS, ["business", "market", "economy", "व्यापार", "बाज़ार"]);
  checkCategory("national", NATIONAL_SIGNALS, ["national", "india", "भारत", "राष्ट्रीय"]);
  checkCategory("health", HEALTH_SIGNALS, ["health", "medical", "स्वास्थ्य"]);
  checkCategory("education", EDUCATION_SIGNALS, ["education", "jobs", "शिक्षा"]);
  checkCategory("sports", SPORTS_SIGNALS, ["sports", "खेल"]);

  // Chhattisgarh Check
  const cgMatches = CHHATTISGARH_DISTRICT_SIGNALS.filter((sig) => fullText.includes(sig));
  const hasCgDistrict = !!input.district || !!input.districtSlug;
  const isCgSection = explicitSection === "chhattisgarh" || explicitSection === "raipur";

  if (cgMatches.length > 0 || hasCgDistrict || isCgSection || explicitTags.includes("chhattisgarh")) {
    matchedCategories.add("chhattisgarh");
    auditReasons["chhattisgarh"] = [
      hasCgDistrict ? `Explicit district: ${input.district || input.districtSlug}` : "",
      cgMatches.length > 0 ? `CG entities: [${cgMatches.slice(0, 3).join(", ")}]` : "",
      isCgSection ? `Section: ${explicitSection}` : "",
    ].filter(Boolean);
  }

  // Ensure every article has at least one category
  if (matchedCategories.size === 0) {
    // Default to chhattisgarh for regional newsroom
    matchedCategories.add("chhattisgarh");
    auditReasons["chhattisgarh"] = ["Jan Darpan regional default"];
  }

  const categoriesList = Array.from(matchedCategories);

  // Determine primary category:
  // Order of editorial prominence: crime > politics > governance > business > national > health > education > sports > chhattisgarh
  const PROMINENCE_ORDER: CanonicalCategoryId[] = [
    "crime",
    "politics",
    "governance",
    "business",
    "national",
    "health",
    "education",
    "sports",
    "chhattisgarh",
  ];

  let primaryCategory: CanonicalCategoryId = "chhattisgarh";
  for (const prio of PROMINENCE_ORDER) {
    if (matchedCategories.has(prio)) {
      primaryCategory = prio;
      break;
    }
  }

  return {
    categories: categoriesList,
    primaryCategory,
    auditReasons,
    confidence: categoriesList.length > 0 ? 0.95 : 0.8,
  };
}

/**
 * Checks if a story matches the target category using canonical categories.
 */
export function isStoryMatchingCategory(
  storyCategories: string[] | undefined | null,
  targetCategoryId: string
): boolean {
  if (!targetCategoryId || targetCategoryId === "all") return true;
  if (!storyCategories || storyCategories.length === 0) return false;
  return storyCategories.includes(targetCategoryId.toLowerCase());
}
