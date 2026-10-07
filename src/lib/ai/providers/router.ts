/**
 * Operation -> provider-chain routing. Free providers first; OpenAI only
 * ever appears in a chain when explicitly enabled — it is never a silent
 * default fallback (see AGENTS.md free-first mandate).
 */

import type { AiProviderId } from "@/lib/ai/providers/types";

// CodeCraft Pro is the PRIMARY bulk editorial engine. Gemini sits in the base chain so that translation and other approved
// secondary work can use it, but it is REMOVED from editorial_generate / editorial_repair unless explicitly approved (see
// withGeminiEditorialGate): over 30 days it silently absorbed ~580 editorial generations (1.2M tokens) when CodeCraft failed,
// burning a limited free quota that is not meant to be a high-volume article engine.
// groq stays as the editorial fallback so a CodeCraft outage degrades instead of blacking out.
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

/** Operations that produce articles. Gemini is never part of these unless explicitly approved. */
export const GEMINI_GATED_OPERATIONS: ReadonlySet<string> = new Set(["editorial_generate", "editorial_repair"]);

/**
 * Explicit approval for Gemini as an EDITORIAL fallback. Off by default; exactly "on" turns it on. Turning it on is a deliberate,
 * visible decision (the admin efficiency panel shows every Gemini editorial call), never an accident of the default chain.
 */
export function isGeminiEditorialFallbackEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.GEMINI_EDITORIAL_FALLBACK?.trim().toLowerCase() === "on";
}

function withGeminiEditorialGate(chain: AiProviderId[], operation: string): AiProviderId[] {
  if (!GEMINI_GATED_OPERATIONS.has(operation) || isGeminiEditorialFallbackEnabled()) return chain;
  return chain.filter((p) => p !== "gemini");
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
  return withGeminiEditorialGate(withCodecraftScope(withOpenAiGate(chain), operation), operation);
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
