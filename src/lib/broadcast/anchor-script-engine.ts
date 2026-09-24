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
  const { headline, summary, district, section, categoryLabel, isBreaking, language } = input;

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

  if (language === "hi") {
    // Detect context from headline, summary, section, and category
    const corpus = `${cleanHeadline} ${cleanSummary} ${section || ""} ${categoryLabel || ""}`.toLowerCase();

    // Clean valid district name
    const validDistrict =
      district && district !== "छत्तीसगढ़" && district !== "राज्य डेस्क" && district !== "State Desk"
        ? district
        : null;

    let leadIn = "";

    if (isBreaking) {
      leadIn = validDistrict
        ? `ब्रेकिंग न्यूज़। ${validDistrict} से इस वक्त की बड़ी खबर सामने आ रही है। `
        : `इस वक्त की बड़ी और अहम खबर। `;
    } else if (
      corpus.includes("मौसम") ||
      corpus.includes("बारिश") ||
      corpus.includes("तापमान") ||
      corpus.includes("ठंड") ||
      corpus.includes("गर्मी") ||
      corpus.includes("आंधी") ||
      corpus.includes("अलर्ट")
    ) {
      leadIn = validDistrict
        ? `${validDistrict} में मौसम को लेकर महत्वपूर्ण जानकारी। `
        : `मौसम को लेकर छत्तीसगढ़ से बड़ी खबर सामने आई है। `;
    } else if (
      corpus.includes("पुलिस") ||
      corpus.includes("गिरफ्तार") ||
      corpus.includes("हादसा") ||
      corpus.includes("दुर्घटना") ||
      corpus.includes("अपराध") ||
      corpus.includes("चोरी") ||
      corpus.includes("मुठभेड़") ||
      corpus.includes("नक्सल")
    ) {
      leadIn = validDistrict
        ? `${validDistrict} से कानून व्यवस्था और पुलिस से जुड़ी इस खबर में। `
        : `पुलिस और कानून व्यवस्था से जुड़ी इस अहम खबर में। `;
    } else if (
      corpus.includes("सरकार") ||
      corpus.includes("कैबिनेट") ||
      corpus.includes("मुख्यमंत्री") ||
      corpus.includes("विष्णु देव साय") ||
      corpus.includes("साय कैबिनेट") ||
      corpus.includes("प्रशासन") ||
      corpus.includes("फैसला") ||
      corpus.includes("बजट")
    ) {
      leadIn = validDistrict
        ? `${validDistrict} से शासन और प्रशासनिक स्तर की बड़ी जानकारी। `
        : `सरकार के इस फैसले से जुड़ी बड़ी जानकारी। `;
    } else if (
      corpus.includes("परीक्षा") ||
      corpus.includes("छात्र") ||
      corpus.includes("स्कूल") ||
      corpus.includes("कॉलेज") ||
      corpus.includes("यूनिवर्सिटी") ||
      corpus.includes("अभ्यर्थी") ||
      corpus.includes("शिक्षा") ||
      corpus.includes("भर्ती")
    ) {
      leadIn = validDistrict
        ? `${validDistrict} के छात्रों और शिक्षण संस्थानों से जुड़ी जरूरी खबर। `
        : `छात्रों और अभ्यर्थियों के लिए महत्वपूर्ण खबर। `;
    } else if (
      corpus.includes("किसान") ||
      corpus.includes("धान") ||
      corpus.includes("फसल") ||
      corpus.includes("खेती") ||
      corpus.includes("कृषि") ||
      corpus.includes("मंडी") ||
      corpus.includes("खाद")
    ) {
      leadIn = validDistrict
        ? `${validDistrict} से किसानों और खेती-किसानी से जुड़ी खबर। `
        : `किसानों और कृषि क्षेत्र से जुड़ी इस खबर में। `;
    } else if (
      corpus.includes("व्यापार") ||
      corpus.includes("बाजार") ||
      corpus.includes("उद्योग") ||
      corpus.includes("कारोबार") ||
      corpus.includes("सोना") ||
      corpus.includes("शेयर")
    ) {
      leadIn = validDistrict
        ? `${validDistrict} के व्यापार और आर्थिक जगत से जुड़ी खबर। `
        : `व्यापार और उद्योग जगत से जुड़ी बड़ी खबर। `;
    } else if (
      corpus.includes("खेल") ||
      corpus.includes("क्रिकेट") ||
      corpus.includes("टूर्नामेंट") ||
      corpus.includes("मैच")
    ) {
      leadIn = validDistrict
        ? `${validDistrict} के खेल मैदान से बड़ी खबर। `
        : `खेल जगत से जुड़ी इस वक्त की खबर। `;
    } else if (validDistrict) {
      leadIn = `${validDistrict} से इस वक्त की एक अहम खबर। `;
    } else {
      leadIn = `छत्तीसगढ़ के ताजा घटनाक्रम में। `;
    }

    // Build complete script: [leadIn] + [cleanHeadline] + [cleanSummary]
    const script = `${leadIn}${cleanHeadline}। ${cleanSummary}`
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/।+/g, "।")
      .trim();

    // Natural duration: ~14 characters per second of Hindi speech
    const durationSec = Math.min(26, Math.max(9, Math.ceil(script.length / 14)));
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
    } else if (validDistrict) {
      leadIn = `Turning now to ${validDistrict}. `;
    } else {
      leadIn = `In key developments from Chhattisgarh. `;
    }

    const script = `${leadIn}${cleanHeadline}. ${cleanSummary}`
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.+/g, ".")
      .trim();

    const durationSec = Math.min(26, Math.max(9, Math.ceil(script.length / 15)));
    return { script, durationSec };
  }
}
