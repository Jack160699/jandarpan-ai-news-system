/**
 * Independent AI reviewer — runs after a draft is generated, on a provider
 * chain distinct from the writer chain (see resolveChatChain("editorial_review")
 * in src/lib/ai/providers/router.ts), to catch issues a single-model pass can
 * miss: claim/source inconsistency, headline-body mismatch, repetition,
 * unsupported allegations, missing attribution, and sensitivity risk.
 *
 * A review failure (parse error, no provider available, ok:false) must NOT
 * silently pass an article — see runIndependentReview's return contract.
 */

import { requestChatCompletion } from "@/lib/ai/providers";
import type { AiProviderId } from "@/lib/ai/providers/types";
import type {
  EditorialDraft,
  IndependentReviewResult,
  IndependentReviewVerdict,
} from "@/lib/news/ai/editorial-types";

const REVIEW_TIMEOUT_MS = 20_000;

function buildSystemPrompt(): string {
  return [
    "You are an independent editorial reviewer for a Hindi-first Indian regional news outlet.",
    "You did NOT write this draft. Review it critically and independently before it can publish.",
    "Check strictly for:",
    "1. Claim-source consistency — every factual claim must be traceable to the fact pack/sources provided.",
    "2. Headline-vs-body consistency — the headline must accurately represent the body.",
    "3. Repetition — redundant sentences or paragraphs restating the same point.",
    "4. Unsupported allegations — claims against named people/entities without attribution.",
    "5. Missing attribution — quotes or serious claims without a named or clearly described source.",
    "6. Sensitivity — communal, caste, gender, minor-safety, suicide, or graphic-violence risk requiring extra care.",
    "7. Original value — does this add enough beyond a bare restatement of the sources.",
    "Respond with strict JSON only, no markdown fences, matching exactly:",
    '{"passed": boolean, "issues": string[], "sensitivity_flags": string[], "confidence": number}',
    "confidence is between 0 and 1. Set passed=false if there are unsupported allegations, missing attribution for serious claims, a headline/body mismatch, or an unaddressed sensitivity risk.",
  ].join("\n");
}

function buildUserPrompt(input: {
  draft: EditorialDraft;
  factPack?: unknown;
}): string {
  const payload: Record<string, unknown> = {
    headline: input.draft.headline,
    summary: input.draft.summary,
    article_body: input.draft.article_body,
    language: input.draft.language,
  };
  if (input.factPack !== undefined) {
    payload.fact_pack = input.factPack;
  }
  return `Review this draft news article for publication.\n\n${JSON.stringify(payload)}`;
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1]!.trim() : trimmed;
}

function parseVerdict(content: string): IndependentReviewVerdict | null {
  try {
    const parsed = JSON.parse(stripJsonFences(content)) as Partial<IndependentReviewVerdict>;
    if (typeof parsed.passed !== "boolean") return null;
    return {
      passed: parsed.passed,
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.map((i) => String(i)).filter(Boolean)
        : [],
      sensitivity_flags: Array.isArray(parsed.sensitivity_flags)
        ? parsed.sensitivity_flags.map((f) => String(f)).filter(Boolean)
        : [],
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0,
    };
  } catch {
    return null;
  }
}

export async function runIndependentReview(input: {
  draft: EditorialDraft;
  writerProvider: AiProviderId;
  /** Optional — another workstream owns fact-pack.ts; shape not depended on here. */
  factPack?: unknown;
  context?: { worker?: string; articleId?: string; eventId?: string };
}): Promise<IndependentReviewResult> {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(input);

  const result = await requestChatCompletion({
    operation: "editorial_review",
    system,
    user,
    jsonMode: true,
    timeoutMs: REVIEW_TIMEOUT_MS,
    context: {
      worker: input.context?.worker ?? "independent_review",
      articleId: input.context?.articleId,
      eventId: input.context?.eventId,
    },
  });

  if (!result.ok) {
    return {
      passed: false,
      verdict: {},
      provider: null,
      error: result.error.message || result.error.code,
    };
  }

  const verdict = parseVerdict(result.content);
  if (!verdict) {
    return {
      passed: false,
      verdict: {},
      provider: result.provider,
      error: "unparseable_review_response",
    };
  }

  return {
    passed: verdict.passed,
    verdict,
    provider: result.provider,
  };
}
