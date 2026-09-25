/**
 * Jan Darpan (जन दर्पण) — editorial voice & tone (Hindi & English)
 * Positioning: A Chhattisgarh-rooted digital news platform expanding across India.
 * Contextual usage: "Jan Darpan — Chhattisgarh & India" / "जन दर्पण — छत्तीसगढ़ और भारत"
 */

export const BRAND_VOICE = {
  /** Canonical product brand */
  nameHi: "जन दर्पण",
  nameEn: "Jan Darpan",
  shortNameEn: "Jan Darpan",
  shortNameHi: "जन दर्पण",
  /** Contextual branding */
  contextualEn: "Jan Darpan — Chhattisgarh & India",
  contextualHi: "जन दर्पण — छत्तीसगढ़ और भारत",
  /** One-line promise — use in metadata, OG, masthead */
  promiseHi: "छत्तीसगढ़ से देश तक — निष्पक्ष, तथ्यपरक और भरोसेमंद समाचार",
  promiseEn: "A Chhattisgarh-rooted digital news platform expanding across India",
  /** How we speak */
  tone: [
    "सीधी, प्रामाणिक, विश्वसनीय — बिना किसी दिखावे या पक्षपात के",
    "छत्तीसगढ़ के ज़मीनी मुद्दे और राष्ट्रीय महत्व के घटनाक्रम — त्वरित, तथ्यपरक और संतुलित",
    "भ्रामक या क्लिकबेट शब्द नहीं — स्पष्ट, गरिमापूर्ण और तथ्य-आधारित पत्रकारिता",
  ],
  /** What we avoid (legal + clarity) */
  avoid: [
    "Bhaskar, Dainik Bhaskar, Hamar Chhattisgarh legacy naming",
    "Jan Darpan India / Jan Darpan Bharat as standalone primary brand",
    "AI-generated, neural, algorithm labels on reader UI",
    "Internal scores, confidence %, desk jargon",
    "Unverified sensationalism or clickbait headlines",
  ],
  deskLabelHi: "जन दर्पण न्यूज़ डेस्क",
  deskLabelEn: "Jan Darpan News Desk",
  correctionsEmail: "shriyanshchandrakar@gmail.com",
  pressLineHi: "जन दर्पण · भिलाई / रायपुर, छत्तीसगढ़",
  pressLineEn: "Jan Darpan · Bhilai / Raipur, Chhattisgarh, India",
} as const;

export function newsroomByline(language: "hi" | "en" | string): string {
  return language === "en" ? BRAND_VOICE.deskLabelEn : BRAND_VOICE.deskLabelHi;
}
