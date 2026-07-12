/**
 * JDP-007 — Reader AI Assistant feature flags
 */

/** Enable AI Assistant V3 experience (default OFF — set NEXT_PUBLIC_AI_ASSISTANT_V3=1) */
export function isAiAssistantV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_ASSISTANT_V3 === "1";
}
