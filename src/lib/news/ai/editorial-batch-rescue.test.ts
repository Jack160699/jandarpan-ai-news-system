import { describe, expect, it } from "vitest";

import { isSafeBatchRescueCandidate } from "./editorial-batch-rescue";
import type { EditorialQualityReport } from "./editorial-guards";

function quality(
  overrides: Partial<EditorialQualityReport>
): EditorialQualityReport {
  return {
    publish_allowed: false,
    hard_reject: false,
    ...overrides,
  } as EditorialQualityReport;
}

describe("batch rescue safety", () => {
  it("cannot override a human-quality repair or hold", () => {
    expect(
      isSafeBatchRescueCandidate(
        quality({ publishDecision: "repair", should_repair: true })
      )
    ).toBe(false);
  });

  it("accepts only an already publishable, non-hard-rejected candidate", () => {
    expect(isSafeBatchRescueCandidate(quality({ publish_allowed: true }))).toBe(
      true
    );
    expect(
      isSafeBatchRescueCandidate(
        quality({ publish_allowed: true, hard_reject: true })
      )
    ).toBe(false);
  });
});
