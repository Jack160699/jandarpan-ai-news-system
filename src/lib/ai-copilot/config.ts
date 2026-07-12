/**
 * AI Editorial Copilot — feature flag
 */

export function isAiCopilotEnabled(): boolean {
  return process.env.AI_EDITORIAL_COPILOT === "true";
}

export const COPILOT_MAX_RECOMMENDATIONS = Number(
  process.env.COPILOT_MAX_RECOMMENDATIONS ?? 100
);

export const COPILOT_CHAT_HISTORY_LIMIT = Number(
  process.env.COPILOT_CHAT_HISTORY_LIMIT ?? 50
);
