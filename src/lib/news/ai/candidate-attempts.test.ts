import { describe, expect, it } from "vitest";
import {
  candidateBackoffMs,
  CANDIDATE_BACKOFF_MAX_MS,
  isCandidateBlocked,
  isCountableCandidateFailure,
  isDeadLettered,
  MAX_CANDIDATE_ATTEMPTS,
} from "./candidate-attempts";

describe("failed-candidate tracking policy", () => {
  it("dead-letters after 4 attempts", () => {
    expect(MAX_CANDIDATE_ATTEMPTS).toBe(4);
    expect([1, 2, 3].map(isDeadLettered)).toEqual([false, false, false]);
    expect(isDeadLettered(4)).toBe(true);
  });

  it("backs off exponentially (15m, 30m, 60m, 120m) and caps at 12h", () => {
    const min = (ms: number) => ms / 60_000;
    expect([1, 2, 3, 4].map((n) => min(candidateBackoffMs(n)))).toEqual([15, 30, 60, 120]);
    expect(candidateBackoffMs(30)).toBe(CANDIDATE_BACKOFF_MAX_MS);
  });

  it("only counts real candidate failures, never governor/infrastructure outcomes", () => {
    expect(isCountableCandidateFailure("llm_generation_failed")).toBe(true);
    expect(isCountableCandidateFailure("model_response_did_not_form_valid_article_body")).toBe(true);
    expect(isCountableCandidateFailure("quality_checks_failed")).toBe(true);
    expect(isCountableCandidateFailure("DEFERRED_QUOTA")).toBe(false);
    expect(isCountableCandidateFailure("RUN_BUDGET_EXHAUSTED")).toBe(false);
    expect(isCountableCandidateFailure("ai_provider_cooldown")).toBe(false);
    expect(isCountableCandidateFailure("slug_already_exists")).toBe(false);
    expect(isCountableCandidateFailure(undefined)).toBe(false);
  });

  it("blocks dead-lettered events and events still in backoff", () => {
    const now = 1_000_000;
    expect(isCandidateBlocked({ attempts: 4, nextRetryAt: null, deadLettered: true }, now)).toBe(true);
    expect(isCandidateBlocked({ attempts: 1, nextRetryAt: now + 1, deadLettered: false }, now)).toBe(true);
    expect(isCandidateBlocked({ attempts: 1, nextRetryAt: now - 1, deadLettered: false }, now)).toBe(false);
    expect(isCandidateBlocked({ attempts: 0, nextRetryAt: null, deadLettered: false }, now)).toBe(false);
  });
});
