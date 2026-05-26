import type { RiskLevel } from "@/lib/intelligence/types";

export type SentimentScore = {
  score: number;
  label: "negative" | "neutral" | "positive";
  polarity: number;
  signals: string[];
};

const POSITIVE =
  /\b(success|growth|peace|victory|achievement|सफल|शांति|जीत|उन्नति|positive)\b/i;
const NEGATIVE =
  /\b(protest|violence|death|crisis|scam|corruption|violence|हिंसा|मौत|संकट|भ्रष्टाचार|विरोध)\b/i;
const ANGER = /\b(anger|outrage|condemn|fury|नाराज|गुस्सा|निंदा)\b/i;

export function analyzeSentiment(text: string): SentimentScore {
  const blob = text.toLowerCase();
  const signals: string[] = [];
  let pos = 0;
  let neg = 0;

  if (POSITIVE.test(blob)) {
    pos += 1;
    signals.push("positive_lexicon");
  }
  if (NEGATIVE.test(blob)) {
    neg += 2;
    signals.push("negative_lexicon");
  }
  if (ANGER.test(blob)) {
    neg += 1;
    signals.push("anger_tone");
  }

  const polarity = Math.max(-1, Math.min(1, (pos - neg) / 3));
  const score = (polarity + 1) / 2;

  const label: SentimentScore["label"] =
    score >= 0.62 ? "positive" : score <= 0.38 ? "negative" : "neutral";

  return { score, label, polarity, signals };
}

export function sentimentRiskLevel(s: SentimentScore): RiskLevel {
  if (s.label === "negative" && s.polarity < -0.5) return "high";
  if (s.label === "negative") return "medium";
  return "low";
}
