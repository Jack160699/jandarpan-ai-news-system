/**
 * Operation -> provider-chain routing. Free providers first; OpenAI only
 * ever appears in a chain when explicitly enabled — it is never a silent
 * default fallback (see AGENTS.md free-first mandate).
 */

import type { AiProviderId } from "@/lib/ai/providers/types";

const WRITER_CHAIN: AiProviderId[] = ["gemini", "groq", "openrouter", "openai"];
// Independent review must not reuse the provider that generated the draft;
// starting the chain at groq (vs. the writer chain's gemini) keeps writer
// and reviewer on different providers in the common case.
const REVIEWER_CHAIN: AiProviderId[] = ["groq", "gemini", "openrouter", "openai"];
const LIGHTWEIGHT_CHAIN: AiProviderId[] = ["groq", "gemini", "openrouter", "openai"];
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
  return withOpenAiGate(chain);
}

/** Provider that should have generated the draft, used to pick a *different* reviewer provider at call time. */
export function resolveReviewerChain(writerProvider?: AiProviderId): AiProviderId[] {
  const chain = withOpenAiGate(REVIEWER_CHAIN);
  if (!writerProvider) return chain;
  const reordered = chain.filter((p) => p !== writerProvider);
  return reordered.length ? reordered : chain;
}

export function resolveEmbeddingChain(): AiProviderId[] {
  return withOpenAiGate(EMBEDDING_CHAIN);
}

export function resolveImageChain(): AiProviderId[] {
  return withOpenAiGate(IMAGE_CHAIN);
}
