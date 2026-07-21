/**
 * Chhattisgarh section classification — state-level news should lead;
 * routine hyperlocal should not.
 */

import { classifyDistrictContent } from "@/lib/regional/district-classifier";

export type StateSectionReason =
  | "state_government"
  | "assembly"
  | "statewide_policy"
  | "multi_district_infra"
  | "economy"
  | "major_politics"
  | "public_health"
  | "statewide_education"
  | "agriculture"
  | "disaster_weather"
  | "major_crime_public_interest"
  | "statewide_institution"
  | "hyperlocal_excluded"
  | "insufficient_state_signal";

export type StateSectionClassification = {
  /** True when the story belongs in the Chhattisgarh state section lead pool */
  isStateLeadEligible: boolean;
  /** True when primarily hyperlocal and should not lead the state section */
  isHyperlocal: boolean;
  reasons: StateSectionReason[];
  confidence: number;
  districtSlug?: string;
};

const STATE_GOV_RE =
  /\b(state government|राज्य सरकार|secretariat|mantralaya|मंत्रालय|cabinet|cabinet meeting|cabinet decision)\b/i;
const ASSEMBLY_RE =
  /\b(vidhan sabha|विधान सभा|assembly session|legislative assembly|mahanadi bhawan)\b/i;
const POLICY_RE =
  /\b(policy|policy\s+announcement|scheme|योजना|notification|gazette|नोटिफिकेशन)\b/i;
const INFRA_RE =
  /\b(highway|expressway|railway|airport|power grid|irrigation|infrastructure|सड़क|रेल|बिजली परियोजना)\b/i;
const ECONOMY_RE =
  /\b(budget|gdp|investment|industry|mining royalty|excise|gst|आर्थिक|निवेश|उद्योग)\b/i;
const POLITICS_RE =
  /\b(chief minister|मुख्यमंत्री|deputy cm|governor|राज्यपाल|election commission|by-?election)\b/i;
const HEALTH_RE =
  /\b(outbreak|epidemic|health alert|vaccination|public health|स्वास्थ्य विभाग|महामारी)\b/i;
const EDUCATION_RE =
  /\b(board exam|cg board|university|statewide education|शिक्षा विभाग|बोर्ड परीक्षा)\b/i;
const AGRI_RE =
  /\b(msp|crop insurance|kharif|rabi|drought relief|किसान|कृषि|मंडी)\b/i;
const DISASTER_RE =
  /\b(flood|बाढ़|cyclone|heatwave|earthquake|disaster|मौसम विभाग|orange alert|red alert)\b/i;
const CRIME_RE =
  /\b(naxal|encounter|major accident|train accident|blast|हत्याकांड|नक्सली)\b/i;

const HYPERLOCAL_ROUTINE_RE =
  /\b(school visit|school function|local fair|ward|colony|market visit|municipality ward|मोहल्ला|वार्ड|स्कूल भ्रमण|प्रधानाचार्य)\b/i;

export type StateClassifyInput = {
  title: string;
  body?: string | null;
  region?: string | null;
  category?: string | null;
};

/**
 * Classify whether a story should lead / appear prominently in the
 * Chhattisgarh state section vs remaining district-scoped.
 */
export function classifyForChhattisgarhSection(
  input: StateClassifyInput
): StateSectionClassification {
  const blob = [input.title, input.body, input.region, input.category]
    .filter(Boolean)
    .join(" ");
  const districtClass = classifyDistrictContent(input);
  const reasons: StateSectionReason[] = [];

  const push = (r: StateSectionReason) => {
    if (!reasons.includes(r)) reasons.push(r);
  };

  if (STATE_GOV_RE.test(blob)) push("state_government");
  if (ASSEMBLY_RE.test(blob)) push("assembly");
  if (POLICY_RE.test(blob) && (districtClass.kind === "statewide" || /\bchhattisgarh|छत्तीसगढ़\b/i.test(blob))) {
    push("statewide_policy");
  }
  if (INFRA_RE.test(blob) && (districtClass.kind === "multi_district" || districtClass.kind === "statewide")) {
    push("multi_district_infra");
  }
  if (ECONOMY_RE.test(blob)) push("economy");
  if (POLITICS_RE.test(blob)) push("major_politics");
  if (HEALTH_RE.test(blob)) push("public_health");
  if (EDUCATION_RE.test(blob) && districtClass.kind === "statewide") {
    push("statewide_education");
  }
  if (AGRI_RE.test(blob) && (districtClass.kind === "statewide" || districtClass.kind === "multi_district")) {
    push("agriculture");
  }
  if (DISASTER_RE.test(blob)) push("disaster_weather");
  if (CRIME_RE.test(blob) && (districtClass.kind === "statewide" || districtClass.kind === "multi_district")) {
    push("major_crime_public_interest");
  }
  if (districtClass.kind === "statewide") push("statewide_institution");

  const hasStateSignal = reasons.length > 0;
  const isRoutineHyperlocal =
    districtClass.kind === "district" &&
    HYPERLOCAL_ROUTINE_RE.test(blob) &&
    !hasStateSignal;

  // Example: Durg school visit to Assembly → district/education unless statewide significance
  const schoolAtAssembly =
    HYPERLOCAL_ROUTINE_RE.test(blob) &&
    ASSEMBLY_RE.test(blob) &&
    districtClass.kind === "district" &&
    !POLITICS_RE.test(blob) &&
    !STATE_GOV_RE.test(blob);

  if (isRoutineHyperlocal || schoolAtAssembly) {
    push("hyperlocal_excluded");
    return {
      isStateLeadEligible: false,
      isHyperlocal: true,
      reasons,
      confidence: 0.82,
      districtSlug: districtClass.districtSlug,
    };
  }

  if (districtClass.kind === "district" && !hasStateSignal) {
    push("hyperlocal_excluded");
    return {
      isStateLeadEligible: false,
      isHyperlocal: true,
      reasons,
      confidence: districtClass.confidence,
      districtSlug: districtClass.districtSlug,
    };
  }

  if (!hasStateSignal && districtClass.kind !== "statewide" && districtClass.kind !== "multi_district") {
    push("insufficient_state_signal");
    return {
      isStateLeadEligible: false,
      isHyperlocal: districtClass.kind === "district",
      reasons,
      confidence: 0.4,
      districtSlug: districtClass.districtSlug,
    };
  }

  return {
    isStateLeadEligible: true,
    isHyperlocal: false,
    reasons,
    confidence: Math.max(0.6, districtClass.confidence),
    districtSlug: districtClass.districtSlug,
  };
}

/** Score for ordering within the Chhattisgarh section */
export function scoreStateSectionCandidate(input: StateClassifyInput): number {
  const c = classifyForChhattisgarhSection(input);
  if (!c.isStateLeadEligible) return -100;
  let score = c.confidence * 40 + c.reasons.length * 8;
  if (c.reasons.includes("state_government")) score += 20;
  if (c.reasons.includes("assembly")) score += 16;
  if (c.reasons.includes("disaster_weather")) score += 14;
  if (c.reasons.includes("hyperlocal_excluded")) score -= 50;
  return score;
}
