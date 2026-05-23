/**
 * Jan Darpan Chhattisgarh — editorial voice & tone (Hindi-first)
 */

export const BRAND_VOICE = {
  nameHi: "जन दर्पण छत्तीसगढ़",
  nameEn: "Jan Darpan Chhattisgarh",
  shortNameEn: "Jan Darpan",
  shortNameHi: "जन दर्पण",
  /** One-line promise — use in metadata, OG, masthead */
  promiseHi: "छत्तीसगढ़ की खबर, साफ़ और भरोसेमंद",
  promiseEn: "Clear, trustworthy news from Chhattisgarh",
  /** How we speak */
  tone: [
    "सीधी, गर्म, ज़मीनी — बिना दिखावे के",
    "जिले और शहर का नाम पहले — राज्य पहले, देश बाद में",
    "भ्रामक शब्द नहीं — न तो स्टार्टअप, न तो टेम्पलेट",
  ],
  /** What we avoid (legal + clarity) */
  avoid: [
    "Bhaskar, Dainik Bhaskar, Hamar Chhattisgarh legacy naming",
    "AI-generated, neural, algorithm labels on reader UI",
    "Internal scores, confidence %, desk jargon",
  ],
  deskLabelHi: "जन दर्पण डेस्क",
  deskLabelEn: "Jan Darpan Desk",
  correctionsEmail: "sudhar@jandarpancg.in",
  pressLineHi: "जन दर्पण छत्तीसगढ़ · रायपुर, छत्तीसगढ़",
  pressLineEn: "Jan Darpan Chhattisgarh · Raipur, Chhattisgarh",
} as const;

export function newsroomByline(language: "hi" | "en" | string): string {
  return language === "en" ? BRAND_VOICE.deskLabelEn : BRAND_VOICE.deskLabelHi;
}
