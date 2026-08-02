import { describe, expect, it } from "vitest";
import { classifyAiHttpFailure } from "./errors";

describe("classifyAiHttpFailure", () => {
  it("does not retry exhausted quota responses", () => {
    const error = classifyAiHttpFailure(
      429,
      JSON.stringify({
        error: {
          message: "You exceeded your current quota, please check your plan and billing details.",
          type: "insufficient_quota",
          code: "insufficient_quota",
        },
      })
    );

    expect(error).toMatchObject({
      code: "ai_quota_exhausted",
      retryable: false,
      rateLimited: false,
    });
  });

  it("still retries a temporary rate limit", () => {
    const error = classifyAiHttpFailure(
      429,
      JSON.stringify({ error: { message: "Rate limit reached" } })
    );

    expect(error).toMatchObject({
      code: "ai_rate_limit",
      retryable: true,
      rateLimited: true,
    });
  });
});
