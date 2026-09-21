/**
 * Jan Darpan — India (जन दर्पण — भारत) — editorial voice & tone (Hindi & English)
 */

export const BRAND_VOICE = {
  nameHi: "जन दर्पण — भारत",
  nameEn: "Jan Darpan — India",
  shortNameEn: "Jan Darpan",
  shortNameHi: "जन दर्पण",
  /** One-line promise — use in metadata, OG, masthead */
  promiseHi: "देश और भारत की ताज़ा खबरें, साफ़ और भरोसेमंद",
  promiseEn: "Clear, trustworthy news from across India",
  /** How we speak */
  tone: [
    "सीधी, प्रामाणिक, विश्वसनीय — बिना किसी दिखावे या पक्षपात के",
    "राष्ट्रीय महत्व और जनहित की खबरें पहले — त्वरित, तथ्यपरक और संतुलित",
    "भ्रामक या क्लिकबेट शब्द नहीं — स्पष्ट, गरिमापूर्ण और तथ्य-आधारित पत्रकारिता",
  ],
  /** What we avoid (legal + clarity) */
  avoid: [
    "Bhaskar, Dainik Bhaskar, Hamar Chhattisgarh legacy naming",
    "AI-generated, neural, algorithm labels on reader UI",
    "Internal scores, confidence %, desk jargon",
    "Unverified sensationalism or clickbait headlines",
  ],
  deskLabelHi: "जन दर्पण राष्ट्रीय डेस्क",
  deskLabelEn: "Jan Darpan India Desk",
  correctionsEmail: "editor@jandarpan.news",
  pressLineHi: "जन दर्पण — भारत · नई दिल्ली / देश",
  pressLineEn: "Jan Darpan — India · New Delhi, India",
} as const;

export function newsroomByline(language: "hi" | "en" | string): string {
  return language === "en" ? BRAND_VOICE.deskLabelEn : BRAND_VOICE.deskLabelHi;
}
