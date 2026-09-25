/**
 * Jan Darpan Canonical Category Taxonomy & Classification Engine
 *
 * Implements the authoritative canonical taxonomy:
 * - all: "सभी" / "All" (Union of all eligible articles)
 * - crime: "क्राइम" / "Crime"
 * - politics: "राजनीति" / "Politics"
 * - national: "राष्ट्रीय" / "National"
 * - chhattisgarh: "छत्तीसगढ़" / "Chhattisgarh"
 * - business: "बाज़ार" / "Market"
 * - governance: "प्रशासन" / "Governance"
 * - sports: "खेल" / "Sports"
 * - health: "स्वास्थ्य" / "Health"
 * - education: "शिक्षा" / "Education"
 *
 * Invariants:
 * 1. "सभी" is the union of ALL eligible articles. Every article belongs to "all".
 * 2. Precise, semantic, contextual classification: NOT naive substring matching.
 * 3. Never match short acronyms inside words (e.g. "आप" inside "आपसी", "दल" inside "पशु चिकित्सकों के दल").
 * 4. Multi-tagging is permitted ONLY when legitimately justified by actual editorial content.
 * 5. One canonical category resolution layer for cards, TV player, filters, and reader.
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
    descriptionEn: "Crime, police investigations, arrests, raids, and law enforcement",
  },
  {
    id: "politics",
    labelHi: "राजनीति",
    labelEn: "Politics",
    descriptionHi: "राजनीतिक दल, चुनाव, विपक्ष व विधानसभा",
    descriptionEn: "Political parties, elections, voting, candidates, and party politics",
  },
  {
    id: "national",
    labelHi: "राष्ट्रीय",
    labelEn: "National",
    descriptionHi: "देशभर के प्रमुख राष्ट्रीय मुद्दे व केंद्र सरकार",
    descriptionEn: "National affairs, Union government, Supreme Court, and interstate issues",
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
    descriptionEn: "Business, markets, economy, mandi rates, and industry",
  },
  {
    id: "governance",
    labelHi: "प्रशासन",
    labelEn: "Governance",
    descriptionHi: "प्रशासनिक आदेश, निगम, नीतियां व जनसेवा",
    descriptionEn: "Public administration, collector orders, municipal actions, and civic affairs",
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
    descriptionEn: "Education, universities, examinations, and student affairs",
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

/**
 * Word-boundary safe pattern check in Hindi and English.
 * Prevents "आप" from matching "आपसी", "सत्र" inside unrelated text, etc.
 */
function containsWordOrPhrase(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  const p = phrase.trim().toLowerCase();
  const t = text.toLowerCase();
  if (p.length === 0) return false;

  // For multi-word phrases, a simple substring check is safe
  if (p.includes(" ")) {
    return t.includes(p);
  }

  // For single words (Hindi or English), match bounded by non-word/delimiter characters
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|[\\s,।!?:;()[\\]"'/\\-])${escaped}(?:$|[\\s,।!?:;()[\\]"'/\\-])`, "iu");
  return regex.test(t);
}

// ─── SEMANTIC CATEGORY DEFINITIONS ──────────────────────────────────────────

const CRIME_CORE_SIGNALS = [
  "गिरफ्तार", "हिरासत", "थाना", "कोतवाली", "अपराध", "क्राइम", "तस्करी", "तस्कर", "तस्करों",
  "गांजा बरामद", "गांजा जब्त", "ड्रग्स", "स्मैक", "सट्टा", "अवैध हथियार", "हथियार फैक्ट्री",
  "हत्या", "मर्डर", "चोरी", "डकैती", "धोखाधड़ी", "फर्जीवाड़ा", "जालसाजी",
  "वारदात", "रिमांड", "fir दर्ज", "मुठभेड़", "नक्सली डंप", "विस्फोटक बरामद", "नक्सली हमला", "हत्याकांड",
  "रिश्वत", "रंगे हाथों", "एंटी करप्शन ब्यूरो", "acb", "cbi छापा", "साइबर अपराध",
  "साइबर ठगी", "अवैध कटाई", "अवैध शराब", "नाबालिग से दुष्कर्म", "दुष्कर्म",
  "arrest", "contraband", "smuggling", "police raid", "bribe", "fraud", "cybercrime",
  "narcotics", "murder"
];

// Contextual crime check: "पुलिस" alone is only crime if coupled with action
const CRIME_ACTION_SIGNALS = [
  "पुलिस ने गिरफ्तार", "पुलिस ने पकड़ा", "पुलिस ने दर्ज किया", "पुलिस की दबिश",
  "पुलिस ने किया खुलासा", "पुलिस की कार्रवाई", "पुलिस हिरासत", "पुलिस अधीक्षक ने बताया",
  "पुलिस जांच", "पुलिस बल ने घेराबंदी"
];

const POLITICS_CORE_SIGNALS = [
  "राजनीति", "चुनाव", "उपचुनाव", "विधानसभा चुनाव", "लोकसभा चुनाव", "मतदान", "वोटिंग",
  "प्रत्याशी", "टिकट वितरण", "राजनीतिक दल", "विपक्ष", "पक्ष-विपक्ष",
  "कांग्रेस", "भाजपा", "bjp", "आम आदमी पार्टी", "आप पार्टी", "तृणमूल",
  "प्रदेशाध्यक्ष", "राष्ट्रीय अध्यक्ष", "राजनीतिक बयानबाजी", "पार्टी प्रवक्ता",
  "राज्यसभा सांसद", "सांसद", "विधायक", "फूलो देवी नेताम", "भूपेश बघेल",
  "दीपक बैज", "अविश्वास प्रस्ताव", "राजनीतिक संकट", "चुनावी दौरा", "जनसभा",
  "politics", "election", "candidate", "voting", "political party"
];

const GOVERNANCE_CORE_SIGNALS = [
  "प्रशासन", "कलेक्टर", "जिलाधीश", "नगर निगम", "महापौर", "कमिश्नर", "आयुक्त",
  "प्रशासनिक आदेश", "जिला प्रशासन", "तहसीलदार", "एसडीएम", "पटवारी", "राजस्व विभाग",
  "अधिसूचना जारी", "यातायात एडवाइजरी", "ट्रैफिक डायवर्ट", "राहत शिविर", "मुआवजा",
  "गिरदावरी", "डिजिटल सीमांकन", "शासकीय आदेश", "समीक्षा बैठक", "सरकारी योजना",
  "पीएम जनमन योजना", "सड़क निर्माण की जांच", "गुणवत्ता की जांच", "तकनीकी टीम गठित",
  "ड्रेनेज मास्टर प्लान", "राहत कार्य", "पानी की निकासी", "सिविक", "जलभराव",
  "school suspension", "कार्यालय का औचक निरीक्षण", "लापरवाही पर निलंबन",
  "सड़क निर्माण", "सड़क प्रोजेक्ट", "रिवरफ्रंट प्रोजेक्ट", "धार्मिक कॉरिडोर",
  "लापरवाही", "स्वास्थ्य विभाग ने जारी किया आदेश",
  "governance", "administration", "collector order", "municipal corporation", "civic"
];

const BUSINESS_CORE_SIGNALS = [
  "बाज़ार", "कारोबार", "व्यापार", "मंडी भाव", "सर्राफा", "सोना", "चांदी",
  "दाम", "भाव", "कीमत", "शेयर बाजार", "सेंसेक्स", "निफ्टी", "उद्योग", "उद्योगपति",
  "भिलाई स्टील प्लांट", "स्टील प्लांट", "secl", "nmdc", "cspdcl", "बिजली बिल",
  "जीएसटी", "राजस्व संग्रह", "बजट", "सोलर परियोजना", "दूर्ग सोलर", "बैंक ऋण",
  "ऋण वसूली", "लोन", "अर्थव्यवस्था", "business", "market", "trade", "economy",
  "industry", "mandi"
];

const NATIONAL_GENUINE_SIGNALS = [
  "राष्ट्रीय", "देशभर", "भारत सरकार", "केंद्र सरकार", "प्रधानमंत्री नरेंद्र मोदी",
  "पीएम मोदी", "सुप्रीम कोर्ट", "सर्वोच्च न्यायालय", "संसद", "संसद भवन",
  "लोकसभा", "राज्यसभा सत्र", "केंद्रीय मंत्री", "गृह मंत्रालय", "वित्त मंत्रालय",
  "रक्षा मंत्रालय", "भारतीय सेना", "इसरो", "राष्ट्रीय राजमार्ग प्राधिकरण",
  "nhai", "रेलवे बोर्ड", "रेल मंत्रालय",
  "national issue", "union government", "supreme court", "parliament of india"
];

const HEALTH_CORE_SIGNALS = [
  "स्वास्थ्य", "अस्पताल", "डॉक्टर", "एमबीबीएस", "इंटर्न डॉक्टरों", "स्टाइपेंड",
  "चिकित्सा", "दवा", "मरीज", "इलाज", "स्वास्थ्य विभाग", "एम्स", "मेडिकल कॉलेज",
  "संक्रमण", "सिम्स अस्पताल", "स्वास्थ्य मंत्री", "health", "hospital", "medical", "doctor"
];

const EDUCATION_CORE_SIGNALS = [
  "शिक्षा", "स्कूल", "कॉलेज", "विश्वविद्यालय", "छात्र", "छात्राएं", "परीक्षा",
  "प्रश्नपत्र", "तिमाही परीक्षा", "रिजल्ट", "एडमिशन", "शिक्षक", "प्राध्यापक",
  "cbse", "cgboard", "बोर्ड परीक्षा", "प्राथमिक शाला", "शिक्षा अधिकारी",
  "education", "school", "university", "student", "examination"
];

const SPORTS_CORE_SIGNALS = [
  "खेल", "खिलाड़ी", "क्रिकेट", "टूर्नामेंट", "मैच", "पदक", "गोल्ड मेडल",
  "सिल्वर मेडल", "स्टेडियम", "प्रतियोगिता", "ओलंपिक", "sports", "cricket", "tournament"
];

const CHHATTISGARH_DISTRICT_SIGNALS = [
  "छत्तीसगढ़", "chhattisgarh", "रायपुर", "raipur", "दुर्ग", "durg", "भिलाई", "bhilai",
  "बिलासपुर", "bilaspur", "बस्तर", "bastar", "कोरबा", "korba", "राजनंदगांव", "rajnandgaon",
  "रायगढ़", "raigarh", "अंबिकापुर", "ambikapur", "जगदलपुर", "jagdalpur", "कांकेर", "kanker",
  "दंतेवाड़ा", "dantewada", "सुकमा", "sukma", "बीजापुर", "bijapur", "धमतरी", "dhamtari",
  "महासमुंद", "mahasamund", "कबीरधाम", "kabirdham", "कवर्धा", "kawardha", "बालोद", "balod",
  "बेमेतरा", "bemetara", "गरियाबंद", "gariaband", "बलौदाबाजार", "balodabazar", "जांजगीर",
  "चांपा", "सरगुजा", "surguja", "जशपुर", "jashpur", "कोरिया", "korea", "मनेंद्रगढ़", "mohla",
  "सक्ती", "सारंगढ़", "खैरागढ़", "पेंड्रा", "गौरेla", "साय कैबिनेट", "विष्णु देव साय",
  "विष्णुदेव साय", "महानदी", "इंद्रावती", "हसदेव", "शिवनाथ"
];

/**
 * Resolves all canonical categories for a given news story.
 *
 * Rules:
 * 1. Categorization is based on the ACTUAL SUBJECT MATTER of the story.
 * 2. Word boundaries prevent accidental matches (e.g., "आपसी" does not trigger "आप").
 * 3. Mentions of government entities/ministers in non-political contexts (e.g., bus fire, doctor stipend)
 *    do not falsely trigger politics.
 * 4. Scraped section="india" does NOT falsely label a local district story as "national".
 * 5. Multi-tagging is supported when genuinely justified.
 * 6. Always deterministic and auditable.
 */
export function resolveCanonicalCategories(
  input: CategoryResolutionInput
): CategoryResolutionResult {
  const headline = (input.headline || "").trim();
  const summary = (input.summary || "").trim();
  const body = (input.body || input.content || "").trim();
  const fullText = `${headline} ${summary} ${body}`;

  const explicitTags = (input.tags || []).map((t) => t.toLowerCase());
  const auditReasons: Record<string, string[]> = {};
  const matchedCategories = new Set<CanonicalCategoryId>();

  // Helper to test if any signal matches with word boundary
  const hasSignal = (signals: string[]): string | null => {
    for (const sig of signals) {
      if (containsWordOrPhrase(headline, sig) || containsWordOrPhrase(summary, sig) || containsWordOrPhrase(body, sig)) {
        return sig;
      }
    }
    return null;
  };

  // Helper specifically for headline matches
  const hasHeadlineSignal = (signals: string[]): string | null => {
    for (const sig of signals) {
      if (containsWordOrPhrase(headline, sig)) {
        return sig;
      }
    }
    return null;
  };

  // 1. CRIME EVALUATION
  let isCrime = false;
  const crimeCoreMatch = hasSignal(CRIME_CORE_SIGNALS);
  const crimeActionMatch = hasSignal(CRIME_ACTION_SIGNALS);
  const isRescueOrDrowning =
    containsWordOrPhrase(headline, "रेस्क्यू") ||
    containsWordOrPhrase(headline, "सुरक्षित बाहर निकाला") ||
    containsWordOrPhrase(headline, "बचाव") ||
    containsWordOrPhrase(headline, "तेज बहाव") ||
    containsWordOrPhrase(headline, "नदी में गिरे");

  if (crimeCoreMatch && !isRescueOrDrowning) {
    isCrime = true;
    auditReasons["crime"] = [`Crime concept matched: '${crimeCoreMatch}'`];
  } else if (crimeActionMatch && !isRescueOrDrowning) {
    isCrime = true;
    auditReasons["crime"] = [`Police action matched: '${crimeActionMatch}'`];
  } else if ((explicitTags.includes("crime") || explicitTags.includes("अपराध")) && !isRescueOrDrowning) {
    isCrime = true;
    auditReasons["crime"] = ["Explicit editorial crime tag"];
  }
  if (isCrime) matchedCategories.add("crime");

  // 2. POLITICS EVALUATION
  // Must be about political parties, elections, voting, or political leadership affairs.
  // Bus accident involving ministry employees, or official government circulars are NOT politics.
  let isPolitics = false;
  const hlPoliticsMatch = hasHeadlineSignal(POLITICS_CORE_SIGNALS);
  const bodyPoliticsMatch = hasSignal(POLITICS_CORE_SIGNALS);

  // Guard against non-political stories mentioning ministry/government
  const isAccidentOrCivic =
    containsWordOrPhrase(headline, "आग") ||
    containsWordOrPhrase(headline, "हादसा") ||
    containsWordOrPhrase(headline, "दुर्घटना") ||
    containsWordOrPhrase(headline, "शव") ||
    containsWordOrPhrase(headline, "हाथी");

  if (hlPoliticsMatch && !isAccidentOrCivic) {
    isPolitics = true;
    auditReasons["politics"] = [`Political headline topic: '${hlPoliticsMatch}'`];
  } else if (bodyPoliticsMatch && !isAccidentOrCivic && !isCrime) {
    // In body, require election or party specific terms
    if (
      containsWordOrPhrase(fullText, "चुनाव") ||
      containsWordOrPhrase(fullText, "कांग्रेस") ||
      containsWordOrPhrase(fullText, "भाजपा") ||
      containsWordOrPhrase(fullText, "विधानसभा") ||
      containsWordOrPhrase(fullText, "सांसद")
    ) {
      isPolitics = true;
      auditReasons["politics"] = [`Political context matched: '${bodyPoliticsMatch}'`];
    }
  } else if (explicitTags.includes("politics") && !isAccidentOrCivic) {
    isPolitics = true;
    auditReasons["politics"] = ["Explicit editorial politics tag"];
  }
  if (isPolitics) matchedCategories.add("politics");

  // 3. GOVERNANCE (प्रशासन) EVALUATION
  let isGovernance = false;
  const govMatch = hasSignal(GOVERNANCE_CORE_SIGNALS);
  if (govMatch) {
    isGovernance = true;
    auditReasons["governance"] = [`Administrative/civic concept: '${govMatch}'`];
  } else if (explicitTags.includes("governance") || explicitTags.includes("administration") || explicitTags.includes("प्रशासन")) {
    isGovernance = true;
    auditReasons["governance"] = ["Explicit editorial governance tag"];
  }
  if (isGovernance) matchedCategories.add("governance");

  // 4. BUSINESS (बाज़ार) EVALUATION
  // Must have actual market/economic signals; never tag an education/police story as business merely because of a generic tag.
  let isBusiness = false;
  const busMatch = hasSignal(BUSINESS_CORE_SIGNALS);
  if (busMatch) {
    isBusiness = true;
    auditReasons["business"] = [`Market/business topic: '${busMatch}'`];
  } else if ((explicitTags.includes("business") || explicitTags.includes("बाज़ार") || explicitTags.includes("व्यापार")) && busMatch) {
    isBusiness = true;
    auditReasons["business"] = ["Explicit editorial business tag"];
  }
  if (isBusiness) matchedCategories.add("business");

  // 5. NATIONAL (राष्ट्रीय) EVALUATION
  // Must be genuinely national in scope. Do NOT assign just because section='india'.
  let isNational = false;
  const natHlMatch = hasHeadlineSignal(NATIONAL_GENUINE_SIGNALS);
  const natBodyMatch = hasSignal(NATIONAL_GENUINE_SIGNALS);
  if (natHlMatch) {
    isNational = true;
    auditReasons["national"] = [`National headline topic: '${natHlMatch}'`];
  } else if (natBodyMatch && (containsWordOrPhrase(fullText, "केंद्र सरकार") || containsWordOrPhrase(fullText, "सुप्रीम कोर्ट") || containsWordOrPhrase(fullText, "संसद"))) {
    isNational = true;
    auditReasons["national"] = [`National context: '${natBodyMatch}'`];
  }
  if (isNational) matchedCategories.add("national");

  // 6. HEALTH EVALUATION
  let isHealth = false;
  const healthMatch = hasSignal(HEALTH_CORE_SIGNALS);
  if (healthMatch) {
    isHealth = true;
    auditReasons["health"] = [`Healthcare context: '${healthMatch}'`];
  } else if (explicitTags.includes("health") || explicitTags.includes("स्वास्थ्य")) {
    isHealth = true;
    auditReasons["health"] = ["Explicit editorial health tag"];
  }
  if (isHealth) matchedCategories.add("health");

  // 7. EDUCATION EVALUATION
  let isEducation = false;
  const eduMatch = hasSignal(EDUCATION_CORE_SIGNALS);
  if (eduMatch) {
    isEducation = true;
    auditReasons["education"] = [`Education context: '${eduMatch}'`];
  } else if (explicitTags.includes("education") || explicitTags.includes("शिक्षा")) {
    isEducation = true;
    auditReasons["education"] = ["Explicit editorial education tag"];
  }
  if (isEducation) matchedCategories.add("education");

  // 8. SPORTS EVALUATION
  let isSports = false;
  const sportsMatch = hasSignal(SPORTS_CORE_SIGNALS);
  if (sportsMatch) {
    isSports = true;
    auditReasons["sports"] = [`Sports context: '${sportsMatch}'`];
  } else if (explicitTags.includes("sports") || explicitTags.includes("खेल")) {
    isSports = true;
    auditReasons["sports"] = ["Explicit editorial sports tag"];
  }
  if (isSports) matchedCategories.add("sports");

  // 9. CHHATTISGARH EVALUATION
  // Any story located in Chhattisgarh or involving CG districts belongs to "छत्तीसगढ़"
  const cgEntityMatch = hasSignal(CHHATTISGARH_DISTRICT_SIGNALS);
  const hasCgDistrict = !!input.district || !!input.districtSlug;
  const isCgSection = input.section === "chhattisgarh" || input.section === "raipur";

  if (cgEntityMatch || hasCgDistrict || isCgSection || explicitTags.includes("chhattisgarh")) {
    matchedCategories.add("chhattisgarh");
    auditReasons["chhattisgarh"] = [
      hasCgDistrict ? `District: ${input.district || input.districtSlug}` : "",
      cgEntityMatch ? `CG Entity: '${cgEntityMatch}'` : "",
    ].filter(Boolean);
  }

  // Ensure every article has at least one category tag besides 'all'
  if (matchedCategories.size === 0) {
    matchedCategories.add("chhattisgarh");
    auditReasons["chhattisgarh"] = ["Jan Darpan regional default"];
  }

  const categoriesList = Array.from(matchedCategories);

  // Determine primary dominant category
  // Editorial prominence hierarchy:
  // crime > politics > governance > business > health > education > sports > national > chhattisgarh
  const PROMINENCE: CanonicalCategoryId[] = [
    "crime",
    "politics",
    "governance",
    "business",
    "health",
    "education",
    "sports",
    "national",
    "chhattisgarh",
  ];

  let primaryCategory: CanonicalCategoryId = "chhattisgarh";
  for (const prio of PROMINENCE) {
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
 * "all" is the union of all eligible stories; returns true for any valid story.
 */
export function isStoryMatchingCategory(
  storyCategories: string[] | undefined | null,
  targetCategoryId: string
): boolean {
  if (!targetCategoryId || targetCategoryId === "all") return true;
  if (!storyCategories || storyCategories.length === 0) return false;
  return storyCategories.includes(targetCategoryId.toLowerCase());
}
