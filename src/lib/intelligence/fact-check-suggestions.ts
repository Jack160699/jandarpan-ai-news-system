import type { FactCheckSuggestion } from "@/lib/intelligence/types";

const CLAIM_RE =
  /\b(claimed|claims|alleges|reportedly|according to|आरोप|कथित|बताया|कहा)\b/i;
const NUMBER_RE = /\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?%)\b/g;

export function suggestFactChecks(input: {
  headline: string;
  summary: string;
  sourceCount: number;
}): FactCheckSuggestion[] {
  const blob = `${input.headline} ${input.summary}`;
  const suggestions: FactCheckSuggestion[] = [];

  if (input.sourceCount < 2) {
    suggestions.push({
      id: "fc-single-source",
      priority: "high",
      check: "Cross-verify with at least two independent sources",
      category: "sourcing",
    });
  }

  if (CLAIM_RE.test(blob)) {
    suggestions.push({
      id: "fc-attribution",
      priority: "medium",
      check: "Attribute claims to named officials or documents",
      category: "attribution",
    });
  }

  const numbers = blob.match(NUMBER_RE);
  if (numbers && numbers.length >= 2) {
    suggestions.push({
      id: "fc-numbers",
      priority: "high",
      check: `Verify statistics: ${numbers.slice(0, 3).join(", ")}`,
      category: "data",
    });
  }

  if (/\b(video|viral|clip|वीडियो)\b/i.test(blob)) {
    suggestions.push({
      id: "fc-media",
      priority: "medium",
      check: "Confirm video authenticity and original upload date",
      category: "media",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "fc-standard",
      priority: "low",
      check: "Standard desk fact-check: names, places, dates",
      category: "standard",
    });
  }

  return suggestions;
}
