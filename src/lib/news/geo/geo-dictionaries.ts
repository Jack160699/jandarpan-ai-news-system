/**
 * Validated place / institution dictionaries for geo-scope classification.
 * Evidence only — a term match is proof of what a story is ABOUT, never a guess
 * that a story belongs to a Chhattisgarh district.
 */

/** Indian states / UTs (other than Chhattisgarh) and major cities. */
export const INDIA_OTHER_PLACES: readonly string[] = [
  // states / UTs
  "delhi", "new delhi", "mumbai", "maharashtra", "uttar pradesh", "madhya pradesh", "bihar",
  "rajasthan", "gujarat", "karnataka", "tamil nadu", "kerala", "west bengal", "odisha",
  "jharkhand", "telangana", "andhra pradesh", "punjab", "haryana", "assam", "uttarakhand",
  "himachal", "jammu", "kashmir", "ladakh", "goa", "manipur", "meghalaya", "nagaland",
  "tripura", "mizoram", "sikkim", "arunachal", "puducherry", "chandigarh",
  "दिल्ली", "नई दिल्ली", "मुंबई", "महाराष्ट्र", "उत्तर प्रदेश", "मध्य प्रदेश", "बिहार",
  "राजस्थान", "गुजरात", "कर्नाटक", "तमिलनाडु", "केरल", "पश्चिम बंगाल", "ओडिशा",
  "झारखंड", "तेलंगाना", "आंध्र प्रदेश", "पंजाब", "हरियाणा", "असम", "उत्तराखंड",
  "हिमाचल", "जम्मू", "कश्मीर", "लद्दाख", "गोवा", "मणिपुर", "मेघालय", "नागालैंड",
  // major cities
  "kolkata", "chennai", "bengaluru", "bangalore", "hyderabad", "pune", "ahmedabad", "lucknow",
  "patna", "jaipur", "bhopal", "indore", "nagpur", "varanasi", "kanpur", "amritsar", "ludhiana",
  "surat", "ranchi", "bhubaneswar", "guwahati", "dehradun", "srinagar", "thiruvananthapuram",
  "कोलकाता", "चेन्नई", "बेंगलुरु", "हैदराबाद", "पुणे", "अहमदाबाद", "लखनऊ", "पटना",
  "जयपुर", "भोपाल", "इंदौर", "नागपुर", "वाराणसी", "कानपुर", "अमृतसर", "रांची",
];

/** National institutions / topics — evidence a story is national in scope. */
export const INDIA_NATIONAL_TERMS: readonly string[] = [
  "parliament", "lok sabha", "rajya sabha", "supreme court", "high court", "prime minister",
  "union cabinet", "union government", "central government", "rbi", "sebi", "isro", "drdo",
  "bcci", "ipl", "nifty", "sensex", "election commission", "finance minister", "home minister",
  "union budget", "gst council", "indian army", "indian railways", "modi", "india",
  "संसद", "लोकसभा", "राज्यसभा", "सुप्रीम कोर्ट", "प्रधानमंत्री", "केंद्र सरकार", "केंद्रीय",
  "आरबीआई", "इसरो", "बीसीसीआई", "आईपीएल", "सेंसेक्स", "निफ्टी", "चुनाव आयोग", "वित्त मंत्री",
  "गृह मंत्री", "केंद्रीय बजट", "भारत", "भारतीय", "मोदी",
];

/** Foreign countries / cities / conflicts — evidence a story is international. */
export const INTERNATIONAL_TERMS: readonly string[] = [
  "united states", "usa", "u.s.", "america", "washington", "new york", "trump", "biden",
  "china", "beijing", "pakistan", "islamabad", "bangladesh", "dhaka", "nepal", "sri lanka",
  "russia", "moscow", "putin", "ukraine", "kyiv", "israel", "gaza", "iran", "tehran", "hamas",
  "united kingdom", "britain", "london", "canada", "australia", "japan", "tokyo", "france",
  "paris", "germany", "berlin", "saudi", "dubai", "uae", "turkey", "afghanistan", "taliban",
  "united nations", "nato", "who ", "imf", "world bank", "g20", "european union",
  "अमेरिका", "वाशिंगटन", "ट्रंप", "बाइडेन", "चीन", "बीजिंग", "पाकिस्तान", "इस्लामाबाद",
  "बांग्लादेश", "ढाका", "नेपाल", "श्रीलंका", "रूस", "मॉस्को", "पुतिन", "यूक्रेन", "इजरायल",
  "इज़राइल", "गाजा", "ईरान", "तेहरान", "हमास", "ब्रिटेन", "लंदन", "कनाडा", "ऑस्ट्रेलिया",
  "जापान", "फ्रांस", "जर्मनी", "सऊदी", "दुबई", "तुर्की", "अफगानिस्तान", "तालिबान",
  "संयुक्त राष्ट्र", "नाटो",
];

/**
 * Publisher feeds that are Chhattisgarh-only by construction (not search queries).
 * A story from one of these with NO contradicting evidence may be treated as
 * statewide — never as a specific district. Google-News *search* feeds
 * (gnews-cg-*) are deliberately excluded: a query result is not proof of place.
 */
export const CG_DIRECT_PUBLISHER_SOURCES: readonly string[] = [
  "ibc24-cg-direct",
  "bhilai-times-direct",
  "amarujala-cg",
  "lalluram",
  "ibc24",
];
