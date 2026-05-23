/**
 * Hamar Chhattisgarh — editorial voice & tone (Hindi-first)
 */

export const BRAND_VOICE = {
  nameHi: "हमार छत्तीसगढ़",
  nameEn: "Hamar Chhattisgarh",
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
    "Bhaskar, Dainik Bhaskar, or similar national daily branding",
    "AI-generated, neural, algorithm labels on reader UI",
    "Internal scores, confidence %, desk jargon",
  ],
  deskLabelHi: "हमार छत्तीसगढ़ डेस्क",
  deskLabelEn: "Hamar Chhattisgarh Desk",
  correctionsEmail: "sudhar@hamarchhattisgarh.in",
  pressLineHi: "हमार छत्तीसगढ़ · रायपुर, छत्तीसगढ़",
  pressLineEn: "Hamar Chhattisgarh · Raipur, Chhattisgarh",
} as const;

export function newsroomByline(language: "hi" | "en" | string): string {
  return language === "en" ? BRAND_VOICE.deskLabelEn : BRAND_VOICE.deskLabelHi;
}
