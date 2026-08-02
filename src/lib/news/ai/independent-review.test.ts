import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorialDraft } from "@/lib/news/ai/editorial-types";

// independent-review.ts imports requestChatCompletion from "@/lib/ai/providers"
// (the barrel, which re-exports it from ./chat) — mocking the barrel is the
// convention already used in this repo, see
// src/lib/observability/health/checks.phase6.test.ts.
const requestChatCompletion = vi.fn();

vi.mock("@/lib/ai/providers", () => ({
  requestChatCompletion: (...args: unknown[]) => requestChatCompletion(...args),
}));

import { runIndependentReview } from "@/lib/news/ai/independent-review";

const draft: EditorialDraft = {
  headline: "छत्तीसगढ़ में नई विकास योजना की घोषणा",
  summary: "प्रशासन ने जिला स्तर की परियोजनाओं की घोषणा की है।",
  article_body: "यह पूरा लेख है जिसमें प्रशासन की योजना का विस्तार से वर्णन किया गया है।",
  seo_title: "छत्तीसगढ़ में नई विकास योजना की घोषणा",
  seo_description: "प्रशासन ने जिला स्तर की परियोजनाओं की घोषणा की है।",
  tags: ["chhattisgarh", "development"],
  reading_time: "2 min",
  language: "hi",
};

describe("runIndependentReview", () => {
  beforeEach(() => {
    requestChatCompletion.mockReset();
  });

  it("returns passed:true for a well-formed JSON response", async () => {
    requestChatCompletion.mockResolvedValue({
      ok: true,
      content: JSON.stringify({
        passed: true,
        issues: [],
        sensitivity_flags: [],
        confidence: 0.92,
      }),
      provider: "openai",
      latencyMs: 100,
    });

    const result = await runIndependentReview({ draft, writerProvider: "openai" });

    expect(result.passed).toBe(true);
    expect(result.provider).toBe("openai");
    expect(result.verdict).toMatchObject({ passed: true, confidence: 0.92 });
  });

  it("parses a JSON response wrapped in markdown code fences", async () => {
    requestChatCompletion.mockResolvedValue({
      ok: true,
      content:
        '```json\n{"passed": false, "issues": ["missing attribution"], "sensitivity_flags": [], "confidence": 0.4}\n```',
      provider: "openrouter",
      latencyMs: 120,
    });

    const result = await runIndependentReview({ draft, writerProvider: "openai" });

    expect(result.passed).toBe(false);
    expect(result.provider).toBe("openrouter");
    expect(result.verdict).toMatchObject({
      passed: false,
      issues: ["missing attribution"],
    });
  });

  it("fails CLOSED (passed:false) on a malformed/non-JSON response — never silently passes", async () => {
    requestChatCompletion.mockResolvedValue({
      ok: true,
      content: "Sorry, I can't produce structured output right now.",
      provider: "openai",
      latencyMs: 90,
    });

    const result = await runIndependentReview({ draft, writerProvider: "openai" });

    // Safety-critical assertion: an unparseable review response must never
    // be treated as a pass. This is the property the module's own header
    // comment calls out ("must NOT silently pass an article").
    expect(result.passed).toBe(false);
    expect(result.error).toBe("unparseable_review_response");
  });

  it("fails CLOSED (passed:false, provider:null) when no AI provider is available", async () => {
    requestChatCompletion.mockResolvedValue({
      ok: false,
      provider: "gemini",
      latencyMs: 0,
      error: {
        code: "ai_unavailable",
        message: "No AI provider API keys configured for this operation",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    });

    const result = await runIndependentReview({ draft, writerProvider: "openai" });

    expect(result.passed).toBe(false);
    expect(result.provider).toBe(null);
    expect(result.error).toBeTruthy();
  });
});
