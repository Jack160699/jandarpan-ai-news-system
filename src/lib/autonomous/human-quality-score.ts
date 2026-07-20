/**
 * Human-quality score (0–100) for autonomous publish gates.
 *
 * Weights (spec — sum 100):
 * - factualGrounding 25
 * - districtRelevance 20
 * - readability 15
 * - sourceDiversity 15
 * - freshness 10
 * - imagePresence 10
 * - headlineClarity 5
 */

import type {
  HumanQualityBreakdown,
  HumanQualityResult,
} from "@/lib/autonomous/types";

export const HUMAN_QUALITY_WEIGHTS = {
  factualGrounding: 25,
  districtRelevance: 20,
  readability: 15,
  sourceDiversity: 15,
  freshness: 10,
  imagePresence: 10,
  headlineClarity: 5,
} as const;

/** Minimum score to allow autonomous publish (stage_1+) */
export const PUBLISH_THRESHOLD = 82;

/** Repair band lower bound — scores in [70, 81] → repair */
export const REPAIR_THRESHOLD = 70;

/** Soft review / hold ceiling — scores < 70 → hold */
export const REVIEW_THRESHOLD = 70;

/** High-risk category stories require ≥90 to publish */
export const HIGH_RISK_THRESHOLD = 90;

export type QualityGateDecision = "publish" | "repair" | "hold";

export type HumanQualityInput = {
  /** 0–1 component scores */
  factualGrounding: number;
  districtRelevance: number;
  readability: number;
  sourceDiversity: number;
  freshness: number;
  imagePresence: number;
  headlineClarity: number;
  threshold?: number;
};

export type QualityGateResult = {
  decision: QualityGateDecision;
  /** True when the story is in a high-risk category (opts.isHighRisk) */
  highRisk: boolean;
  score: number;
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** EN + HI detectors for high-risk editorial categories */
const HIGH_RISK_PATTERNS: RegExp[] = [
  // Crime / violence
  /\b(murder|homicide|killed|killing|assault|rape|molest|kidnapp|loot|robbery|theft|crime|arrest|FIR|police\s+custody)\b/i,
  /(हत्या|हत्यारा|बलात्कार|अपहरण|लूट|चोरी|अपराध|गिरफ्तार|एफआईआर|पुलिस\s*हिरासत)/,
  // Health / outbreak
  /\b(outbreak|epidemic|pandemic|contagious|hospitali[sz]ed|fatality|deaths?\s+from|food\s+poisoning)\b/i,
  /(महामारी|संक्रमण|अस्पताल\s*में\s*भर्ती|खाद्य\s*विषाक्तता|मृत्यु\s*दर)/,
  // Election / politics sensitive
  /\b(election|ballot|EVMs?|vote\s*rigging|booth\s*captur|campaign\s*finance)\b/i,
  /(चुनाव|मतदान|ईवीएम|बूथ\s*कैप्चर|मत\s*हेरफेर|प्रचार\s*वित्त)/,
  // Financial / market risk
  /\b(scam|fraud|embezzl|insider\s+trading|ponzi|bank\s+failure|loan\s+default|market\s+crash)\b/i,
  /(घोटाला|धोखाधड़ी|गबन|पोंजी|बैंक\s*दिवालिया|बाजार\s*गिरावट)/,
  // Public safety
  /\b(bomb|blast|terror|explosion|evacuate|disaster|collapse|stampede|chemical\s+leak)\b/i,
  /(बम|विस्फोट|आतंक|आपदा|भगदड़|रासायनिक\s*रिसाव|इमारत\s*गिर)/,
  // Allegations
  /\b(alleg(ed|ation|es)|accused\s+of|charges?\s+of|allegedly)\b/i,
  /(आरोप|अभियुक्त|कथित|आरोपपत्र)/,
  // Communal
  /\b(communal|sectarian|riot|religious\s+violence|mob\s+lynch)\b/i,
  /(सांप्रदायिक|दंगा|धार्मिक\s*हिंसा|भीड़\s*हिंसा)/,
  // Court / legal
  /\b(court|verdict|bail|conviction|acquittal|PIL|writ|supreme\s+court|high\s+court)\b/i,
  /(अदालत|न्यायालय|फैसला|जमानत|सजा|बरी|रिट|सुप्रीम\s*कोर्ट|हाई\s*कोर्ट)/,
];

/**
 * Detect high-risk story categories (crime, health, election, financial,
 * public safety, allegations, communal, court) from headline/body text.
 */
export function isHighRiskStory(text: string): boolean {
  const sample = (text ?? "").trim();
  if (!sample) return false;
  return HIGH_RISK_PATTERNS.some((re) => re.test(sample));
}

export function scoreHumanQuality(input: HumanQualityInput): HumanQualityResult {
  const components = {
    factualGrounding: clamp01(input.factualGrounding),
    districtRelevance: clamp01(input.districtRelevance),
    readability: clamp01(input.readability),
    sourceDiversity: clamp01(input.sourceDiversity),
    freshness: clamp01(input.freshness),
    imagePresence: clamp01(input.imagePresence),
    headlineClarity: clamp01(input.headlineClarity),
  };

  const breakdown: HumanQualityBreakdown = {
    factualGrounding:
      components.factualGrounding * HUMAN_QUALITY_WEIGHTS.factualGrounding,
    districtRelevance:
      components.districtRelevance * HUMAN_QUALITY_WEIGHTS.districtRelevance,
    readability: components.readability * HUMAN_QUALITY_WEIGHTS.readability,
    sourceDiversity:
      components.sourceDiversity * HUMAN_QUALITY_WEIGHTS.sourceDiversity,
    freshness: components.freshness * HUMAN_QUALITY_WEIGHTS.freshness,
    imagePresence:
      components.imagePresence * HUMAN_QUALITY_WEIGHTS.imagePresence,
    headlineClarity:
      components.headlineClarity * HUMAN_QUALITY_WEIGHTS.headlineClarity,
  };

  const score = Math.round(
    Object.values(breakdown).reduce((a, b) => a + b, 0)
  );
  const threshold = input.threshold ?? PUBLISH_THRESHOLD;

  return {
    score,
    breakdown,
    publishable: score >= threshold,
    threshold,
  };
}

export function meetsPublishThreshold(
  score: number,
  threshold = PUBLISH_THRESHOLD
): boolean {
  return score >= threshold;
}

/**
 * Threshold bands (routine):
 * - publish ≥ 82
 * - repair 70–81
 * - hold < 70
 *
 * High-risk category stories: publish only if ≥ 90; else repair if ≥ 70 else hold.
 * `highRisk` reflects the category flag (opts.isHighRisk), not score ≥ 90.
 */
export function decideQualityGate(
  score: number,
  opts?: { isHighRisk?: boolean }
): QualityGateResult {
  const isHighRisk = Boolean(opts?.isHighRisk);

  let decision: QualityGateDecision;
  if (isHighRisk) {
    if (score >= HIGH_RISK_THRESHOLD) decision = "publish";
    else if (score >= REPAIR_THRESHOLD) decision = "repair";
    else decision = "hold";
  } else if (score >= PUBLISH_THRESHOLD) {
    decision = "publish";
  } else if (score >= REPAIR_THRESHOLD) {
    decision = "repair";
  } else {
    decision = "hold";
  }

  return {
    decision,
    highRisk: isHighRisk,
    score,
  };
}
