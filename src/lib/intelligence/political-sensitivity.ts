import type { RiskLevel } from "@/lib/intelligence/types";

export type PoliticalSensitivity = {
  score: number;
  level: RiskLevel;
  topics: string[];
  guidance: string;
};

const ELECTION =
  /\b(election|poll|ballot|vote|चुनाव|मतदान|वोट|लोकसभा|विधानसभा)\b/i;
const PARTY =
  /\b(bjp|congress|aap|rss|मोदी|राहुल|भाजपा|कांग्रेस|देशमुख|बघेल)\b/i;
const COMMUNAL =
  /\b(communal|riot|lynch|religion|धर्म|दंगा|सांप्रदायिक)\b/i;
const GOVT =
  /\b(minister|cm|pm|government|सरकार|मंत्री|मुख्यमंत्री|प्रशासन)\b/i;

export function scorePoliticalSensitivity(text: string): PoliticalSensitivity {
  const topics: string[] = [];
  let score = 0.05;

  if (ELECTION.test(text)) {
    topics.push("elections");
    score += 0.35;
  }
  if (PARTY.test(text)) {
    topics.push("parties");
    score += 0.3;
  }
  if (COMMUNAL.test(text)) {
    topics.push("communal");
    score += 0.4;
  }
  if (GOVT.test(text)) {
    topics.push("government");
    score += 0.15;
  }

  score = Math.min(1, score);
  const level: RiskLevel =
    score >= 0.65 ? "critical" : score >= 0.45 ? "high" : score >= 0.25 ? "medium" : "low";

  const guidance =
    level === "critical"
      ? "Legal review required before publish; verify all party quotes."
      : level === "high"
        ? "Senior editor sign-off; balance sources across sides."
        : "Standard desk verification.";

  return { score, level, topics, guidance };
}
