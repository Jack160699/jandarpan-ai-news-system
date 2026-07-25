/**
 * Article-type classification and evidence-based depth targets.
 * Word counts are quality guards — never permission to invent facts.
 */

export type ArticleType =
  | "breaking_alert"
  | "short_update"
  | "standard_report"
  | "explainer"
  | "developing_story"
  | "analysis"
  | "service_information"
  | "live_continuing";

export type ArticleDepthRule = {
  type: ArticleType;
  /** Soft target band (Hindi words) when evidence supports it */
  minWords: number;
  targetWords: number;
  maxWords: number;
  minParagraphs: number;
  /** When evidence is thin, demote to this type instead of padding */
  insufficientFallback: ArticleType;
  labelHi: string;
  labelEn: string;
  promptDepthHint: string;
};

export const ARTICLE_DEPTH_RULES: Record<ArticleType, ArticleDepthRule> = {
  breaking_alert: {
    type: "breaking_alert",
    minWords: 80,
    targetWords: 160,
    maxWords: 280,
    minParagraphs: 2,
    insufficientFallback: "breaking_alert",
    labelHi: "ब्रेकिंग अलर्ट",
    labelEn: "Breaking alert",
    promptDepthHint:
      "Breaking alert: concise, factual, clearly labeled. Prefer verified facts over length. Target ~80–220 Hindi words. Do not pad.",
  },
  short_update: {
    type: "short_update",
    minWords: 220,
    targetWords: 320,
    maxWords: 450,
    minParagraphs: 3,
    insufficientFallback: "breaking_alert",
    labelHi: "संक्षिप्त अपडेट",
    labelEn: "Short update",
    promptDepthHint:
      "Short update: approximately 250–400 Hindi words covering what happened, where/when, and attributed details. No speculation.",
  },
  standard_report: {
    type: "standard_report",
    minWords: 450,
    targetWords: 700,
    maxWords: 1000,
    minParagraphs: 5,
    insufficientFallback: "short_update",
    labelHi: "मानक रिपोर्ट",
    labelEn: "Standard report",
    promptDepthHint:
      "Standard newspaper report: approximately 500–900 Hindi words. Include what happened, where/when, key verified details, attribution, local/district relevance, background when supported, public impact, and what happens next — as natural prose, not labeled sections.",
  },
  explainer: {
    type: "explainer",
    minWords: 700,
    targetWords: 1000,
    maxWords: 1400,
    minParagraphs: 6,
    insufficientFallback: "standard_report",
    labelHi: "व्याख्यात्मक रिपोर्ट",
    labelEn: "Explainer",
    promptDepthHint:
      "Explainer: approximately 800–1,400 Hindi words. Clarify context, background, and why it matters for local readers — only from verified facts.",
  },
  developing_story: {
    type: "developing_story",
    minWords: 280,
    targetWords: 520,
    maxWords: 900,
    minParagraphs: 4,
    insufficientFallback: "short_update",
    labelHi: "विकसित हो रही खबर",
    labelEn: "Developing story",
    promptDepthHint:
      "Developing story: current verified facts plus timeline/context when available. Mark uncertainty clearly. Target ~280–700 Hindi words; do not invent updates.",
  },
  analysis: {
    type: "analysis",
    minWords: 700,
    targetWords: 1100,
    maxWords: 1400,
    minParagraphs: 6,
    insufficientFallback: "standard_report",
    labelHi: "विश्लेषण",
    labelEn: "Analysis",
    promptDepthHint:
      "Analysis: approximately 800–1,400 Hindi words. Distinguish analysis from confirmed fact. Attribute claims. No invented conclusions.",
  },
  service_information: {
    type: "service_information",
    minWords: 180,
    targetWords: 320,
    maxWords: 500,
    minParagraphs: 3,
    insufficientFallback: "short_update",
    labelHi: "सेवा सूचना",
    labelEn: "Service information",
    promptDepthHint:
      "Service information: clear practical facts (schedules, helplines, procedures) only from sources. Approximately 180–450 Hindi words.",
  },
  live_continuing: {
    type: "live_continuing",
    minWords: 250,
    targetWords: 450,
    maxWords: 800,
    minParagraphs: 3,
    insufficientFallback: "developing_story",
    labelHi: "सतत कवरेज",
    labelEn: "Live/continuing coverage",
    promptDepthHint:
      "Continuing coverage: latest verified developments with prior context. Approximately 250–700 Hindi words. Do not claim live on-ground reporting unless sources support it.",
  },
};

export type ArticleTypeClassificationInput = {
  urgencyScore?: number | null;
  signalCount?: number;
  factPackChars?: number;
  category?: string | null;
  canonicalTitle?: string | null;
  eventSummary?: string | null;
  deskTemplate?: string | null;
  /** When true, prefer developing/short over longform */
  thinEvidence?: boolean;
};

export type ArticleTypeClassification = {
  type: ArticleType;
  rule: ArticleDepthRule;
  evidenceChars: number;
  evidenceSufficient: boolean;
  reasons: string[];
};

/** Heuristic: enough source text to support a standard report */
export const EVIDENCE_THRESHOLDS = {
  thinChars: 500,
  shortUpdateChars: 700,
  /** Multi-source / rich single packs should reach standard_report */
  standardChars: 1100,
  explainerChars: 2600,
  analysisSignals: 5,
} as const;

function textBlob(input: ArticleTypeClassificationInput): string {
  return [input.canonicalTitle, input.eventSummary, input.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function estimateEvidenceChars(input: {
  factPackChars?: number;
  signalCount?: number;
}): number {
  const chars = input.factPackChars ?? 0;
  if (chars > 0) return chars;
  // Rough fallback when pack length unknown
  return Math.max(0, (input.signalCount ?? 0) * 400);
}

export function classifyArticleType(
  input: ArticleTypeClassificationInput
): ArticleTypeClassification {
  const reasons: string[] = [];
  const evidenceChars = estimateEvidenceChars(input);
  const signals = input.signalCount ?? 1;
  const urgency = input.urgencyScore ?? 50;
  const cat = (input.category ?? "").toLowerCase();
  const blob = textBlob(input);
  const desk = (input.deskTemplate ?? "").toLowerCase();

  const thin =
    input.thinEvidence === true ||
    evidenceChars < EVIDENCE_THRESHOLDS.thinChars ||
    (signals <= 1 && evidenceChars < EVIDENCE_THRESHOLDS.shortUpdateChars);

  if (thin) {
    reasons.push("thin_evidence");
  }

  let type: ArticleType = "standard_report";

  if (urgency >= 80 || cat === "breaking" || desk === "breaking_news") {
    type = thin ? "breaking_alert" : "breaking_alert";
    reasons.push("high_urgency_or_breaking");
  } else if (
    /explainer|समझें|क्या है|why it matters|backgrounder/i.test(blob) ||
    cat === "explainer"
  ) {
    type = thin ? "short_update" : "explainer";
    reasons.push("explainer_signal");
  } else if (
    /analysis|विश्लेषण|opinion|editorial/i.test(blob) ||
    cat === "analysis" ||
    cat === "investigation"
  ) {
    type = thin ? "standard_report" : "analysis";
    reasons.push("analysis_signal");
  } else if (
    /helpline|advisory|schedule|timetable|how to|सेवा|सलाह|समय सारिणी|आवेदन/i.test(
      blob
    ) ||
    cat === "service" ||
    cat === "weather"
  ) {
    type = "service_information";
    reasons.push("service_information_signal");
  } else if (
    /developing|updates?|live|सतत|विकसित|ताज़ा अपडेट/i.test(blob) ||
    urgency >= 70
  ) {
    type = thin ? "short_update" : "developing_story";
    reasons.push("developing_or_elevated_urgency");
  } else if (desk === "sports_brief") {
    type = thin ? "short_update" : "short_update";
    reasons.push("sports_brief_desk");
  } else if (
    signals >= EVIDENCE_THRESHOLDS.analysisSignals &&
    evidenceChars >= EVIDENCE_THRESHOLDS.explainerChars
  ) {
    type = "explainer";
    reasons.push("rich_multi_source_evidence");
  } else if (evidenceChars < EVIDENCE_THRESHOLDS.shortUpdateChars) {
    type = "short_update";
    reasons.push("limited_source_chars");
  } else if (
    evidenceChars < EVIDENCE_THRESHOLDS.standardChars &&
    signals < 2
  ) {
    type = "short_update";
    reasons.push("moderate_source_chars_single_signal");
  } else {
    type = "standard_report";
    reasons.push("sufficient_for_standard_report");
  }

  // Insufficient evidence: demote rather than pad
  if (thin && type !== "breaking_alert" && type !== "service_information") {
    const fallback = ARTICLE_DEPTH_RULES[type].insufficientFallback;
    if (fallback !== type) {
      reasons.push(`demoted_to_${fallback}`);
      type = fallback;
    }
  }

  const rule = ARTICLE_DEPTH_RULES[type];
  const evidenceSufficient =
    evidenceChars >= EVIDENCE_THRESHOLDS.thinChars &&
    (type === "breaking_alert" ||
      type === "short_update" ||
      type === "service_information" ||
      evidenceChars >= EVIDENCE_THRESHOLDS.standardChars ||
      signals >= 2);

  return {
    type,
    rule,
    evidenceChars,
    evidenceSufficient,
    reasons,
  };
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function paragraphCount(text: string): number {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

export function meetsDepthFloor(
  body: string,
  type: ArticleType,
  options?: { allowThinBreaking?: boolean }
): { ok: boolean; words: number; paragraphs: number; minWords: number } {
  const rule = ARTICLE_DEPTH_RULES[type];
  const words = wordCount(body);
  const paragraphs = paragraphCount(body);
  let minWords = rule.minWords;

  // Breaking stays concise; still require a real alert, not a dek
  if (type === "breaking_alert" && options?.allowThinBreaking !== false) {
    minWords = Math.min(minWords, 80);
  }

  const ok = words >= minWords && paragraphs >= Math.min(2, rule.minParagraphs);
  return { ok, words, paragraphs, minWords };
}

/** Soft publish floor — below this for the classified type is a reject/retry */
export function depthRejectThreshold(type: ArticleType): number {
  const rule = ARTICLE_DEPTH_RULES[type];
  // Allow ~15% under min for Hindi tokenization variance, except breaking
  if (type === "breaking_alert") return rule.minWords;
  return Math.floor(rule.minWords * 0.85);
}
