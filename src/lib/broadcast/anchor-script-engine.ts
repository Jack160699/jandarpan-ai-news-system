/**
 * Jan Darpan Anchor Script Engine
 *
 * Generates natural, broadcast-grade television news anchor narration
 * grounded strictly in actual article facts and metadata.
 *
 * Rules:
 * 1. Zero story numbering ("news number 9", "नंबर 8", etc. are strictly forbidden).
 * 2. Zero robotic repetition (no repeated "छत्तीसगढ़ की latest खबरें" before every story).
 * 3. Natural anchor cadence:
 *    [Context-aware lead-in] -> [Headline / Core development] -> [Context / Key facts from summary]
 * 4. Paced with natural punctuation (Devanagari danda '।' and commas ',') for speech synthesis.
 */

export type AnchorScriptInput = {
  headline: string;
  summary?: string | null;
  articleBody?: string | null;
  district?: string | null;
  section?: string | null;
  categoryLabel?: string | null;
  isBreaking?: boolean;
  language: "hi" | "en";
};

export function generateAnchorSpokenScript(input: AnchorScriptInput): {
  script: string;
  durationSec: number;
} {
  const { headline, summary, articleBody, district, section, categoryLabel, isBreaking, language } = input;

  const cleanHeadline = (headline || "")
    .replace(/^\[.*?\]\s*/, "")
    .replace(/^ब्रेकिंग(?:\s*न्यूज़|\s*:)\s*/i, "")
    .replace(/^breaking(?:\s*news|\s*:)\s*/i, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanSummary = (summary || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanBody = (articleBody || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Full article content takes priority over short summary teaser
  const fullContent = cleanBody.length > cleanSummary.length + 30 ? cleanBody : cleanSummary;

  if (language === "hi") {
    // Detect context from headline, summary, section, and category
    const corpus = `${cleanHeadline} ${fullContent} ${section || ""} ${categoryLabel || ""}`.toLowerCase();

    // Clean valid district name
    const validDistrict =
      district && district !== "छत्तीसगढ़" && district !== "राज्य डेस्क" && district !== "State Desk"
        ? district
        : null;

    let leadIn = "";

    if (isBreaking) {
      leadIn = validDistrict
        ? `ब्रेकिंग न्यूज़। ${validDistrict} से इस वक्त की बड़ी खबर। `
        : `इस वक्त की बड़ी खबर। `;
    } else if (
      corpus.includes("मौसम") ||
      corpus.includes("बारिश") ||
      corpus.includes("तापमान") ||
      corpus.includes("अलर्ट")
    ) {
      leadIn = validDistrict
        ? `${validDistrict} में मौसम को लेकर महत्वपूर्ण जानकारी। `
        : `मौसम विभाग से जुड़ी जानकारी। `;
    } else if (
      corpus.includes("हादसा") ||
      corpus.includes("दुर्घटना") ||
      corpus.includes("मुठभेड़")
    ) {
      leadIn = validDistrict
        ? `${validDistrict} से सामने आ रहे इस घटनाक्रम में। `
        : `सामने आ रहे इस ताजा घटनाक्रम में। `;
    }

    // Build complete script: [leadIn] + [cleanHeadline] + [fullContent]
    // Seamless, natural professional delivery without robotic filler
    const script = `${leadIn}${cleanHeadline}। ${fullContent}`
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/।+/g, "।")
      .trim();

    // Natural duration: ~13 characters per second of Hindi speech
    const durationSec = Math.max(14, Math.ceil(script.length / 13));
    return { script, durationSec };
  } else {
    // Indian English broadcast delivery
    const validDistrict =
      district && district !== "Chhattisgarh" && district !== "State Desk"
        ? district
        : null;

    let leadIn = "";
    if (isBreaking) {
      leadIn = validDistrict
        ? `Breaking news from ${validDistrict}. `
        : `Breaking news at this hour. `;
    }

    const script = `${leadIn}${cleanHeadline}. ${fullContent}`
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.+/g, ".")
      .trim();

    const durationSec = Math.max(14, Math.ceil(script.length / 14));
    return { script, durationSec };
  }
}
