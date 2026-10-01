/**
 * Operation -> provider-chain routing. Free providers first; OpenAI only
 * ever appears in a chain when explicitly enabled — it is never a silent
 * default fallback (see AGENTS.md free-first mandate).
 */

import type { AiProviderId } from "@/lib/ai/providers/types";

// groq is included as a third fallback for editorial generation so that when
// both codecraft and gemini hit their daily RPD caps, the newsroom can still
// publish using Groq's llama-3.3-70b-versatile (rpd: 1000, tpd: 100K).
// This prevents the total DEFERRED_QUOTA blackout seen after UTC midnight resets.
const WRITER_CHAIN: AiProviderId[] = ["codecraft", "gemini", "groq"];
// Independent review: codecraft primary, groq as fallback (same quota resilience).
const REVIEWER_CHAIN: AiProviderId[] = ["codecraft", "groq"];
const LIGHTWEIGHT_CHAIN: AiProviderId[] = ["codecraft", "groq"];
const EMBEDDING_CHAIN: AiProviderId[] = ["cloudflare", "openai"];
const IMAGE_CHAIN: AiProviderId[] = ["cloudflare", "openai"];

const CHAT_OPERATION_CHAINS: Record<string, AiProviderId[]> = {
  editorial_generate: WRITER_CHAIN,
  editorial_repair: WRITER_CHAIN,
  translation: WRITER_CHAIN,
  editorial_review: REVIEWER_CHAIN,
  schema_repair: LIGHTWEIGHT_CHAIN,
  classification_lightweight: LIGHTWEIGHT_CHAIN,
};

/**
 * CodeCraft is a controlled-budget provider. It is only used for the operations listed in
 * CODECRAFT_OPERATIONS (default: editorial_generate, editorial_repair). Translation, review and
 * lightweight/classification calls never touch it unless it is explicitly enabled for them, so
 * secondary work cannot drain the CodeCraft allowance.
 */
export const CODECRAFT_DEFAULT_OPERATIONS = ["editorial_generate", "editorial_repair"] as const;

export function codecraftAllowedOperations(env: Record<string, string | undefined> = process.env): Set<string> {
  const raw = env.CODECRAFT_OPERATIONS?.trim();
  if (raw === undefined || raw === "") return new Set(CODECRAFT_DEFAULT_OPERATIONS);
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

function withCodecraftScope(chain: AiProviderId[], operation: string): AiProviderId[] {
  return codecraftAllowedOperations().has(operation) ? chain : chain.filter((p) => p !== "codecraft");
}

export function isOpenAiProviderEnabled(): boolean {
  return process.env.AI_PROVIDER_OPENAI_ENABLED === "true";
}

function withOpenAiGate(chain: AiProviderId[]): AiProviderId[] {
  return isOpenAiProviderEnabled()
    ? chain
    : chain.filter((provider) => provider !== "openai");
}

/** Provider order for a chat-completion-shaped operation (writer, reviewer, translation, repair, lightweight). */
export function resolveChatChain(operation: string): AiProviderId[] {
  const chain = CHAT_OPERATION_CHAINS[operation] ?? WRITER_CHAIN;
  return withCodecraftScope(withOpenAiGate(chain), operation);
}

/** Provider that should have generated the draft, used to pick a *different* reviewer provider at call time. */
export function resolveReviewerChain(writerProvider?: AiProviderId): AiProviderId[] {
  return withOpenAiGate(REVIEWER_CHAIN);
}

export function resolveEmbeddingChain(): AiProviderId[] {
  return withOpenAiGate(EMBEDDING_CHAIN);
}

export function resolveImageChain(): AiProviderId[] {
  return withOpenAiGate(IMAGE_CHAIN);
}
