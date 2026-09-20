export type SearchOpportunity = {
  id: string;
  query: string;
  volume: number;
  competition: number;
  intent: "informational" | "navigational" | "transactional";
};

export type NewsEventContext = {
  id: string;
  category: string;
  region: string;
  urgencyScore: number;
};

export type OpportunityScore = {
  score: number;
  reasoning: string[];
};

export function scoreSearchOpportunity(
  event: NewsEventContext,
  opportunities: SearchOpportunity[]
): OpportunityScore {
  let score = 0;
  const reasoning: string[] = [];

  if (!opportunities || opportunities.length === 0) {
    return { score: event.urgencyScore, reasoning: ["No search opportunities linked, relying on base urgency"] };
  }

  // Find best opportunity
  const bestOpp = opportunities.sort((a, b) => b.volume - a.volume)[0];
  
  // Base score from event urgency
  score += event.urgencyScore * 50;
  reasoning.push(`Base urgency score: ${event.urgencyScore * 50}`);

  // Volume bonus
  const volumeBonus = Math.min(30, bestOpp.volume / 1000);
  score += volumeBonus;
  reasoning.push(`Volume bonus: +${volumeBonus}`);

  // Competition penalty (higher competition = lower score)
  const competitionPenalty = bestOpp.competition * 20;
  score -= competitionPenalty;
  reasoning.push(`Competition penalty: -${competitionPenalty}`);

  // Intent multiplier
  if (bestOpp.intent === "informational") {
    score *= 1.2;
    reasoning.push("Informational intent multiplier: x1.2");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasoning
  };
}
