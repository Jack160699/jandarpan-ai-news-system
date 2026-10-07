import { describe, expect, it } from "vitest";

import { buildEditorialPipelineSystemPrompt } from "./prompts";

describe("editorial depth correction prompt", () => {
  it("makes a retry distinct and states the measured hard minimum", () => {
    const base = {
      language: "hi" as const,
      deskTemplate: "district_update" as const,
      articleType: "short_update" as const,
      evidenceSufficient: true,
    };
    const initial = buildEditorialPipelineSystemPrompt(base);
    const retry = buildEditorialPipelineSystemPrompt({
      ...base,
      repairContext: { failureCodes: [],
        attempt: 1,
        previousWords: 141,
        minWords: 250,
        targetWords: 320,
      },
    });

    expect(retry).not.toBe(initial);
    expect(retry).toContain("previous body had only 141 words");
    expect(retry).toContain("at least 250 words");
    expect(retry).toContain("approach 320");
    expect(retry).toContain("Do not reuse the short draft");
  });

  it("states the hard word floor on the FIRST pass so a paid depth retry is not needed to learn it", () => {
    const base = {
      language: "hi" as const,
      deskTemplate: "district_update" as const,
      evidenceSufficient: true,
    };
    // short_update floor = floor(220 * 0.85) = 187 (the gate's own threshold, not a new number)
    const initial = buildEditorialPipelineSystemPrompt({ ...base, articleType: "short_update" });
    expect(initial).toContain("HARD MINIMUM");
    expect(initial).toContain("at least 187 words");
    expect(initial).toContain("Never use filler, repetition or invention");

    // Thin evidence still gets the floor (the type is demoted, never padded) and the no-speculation rule.
    const thin = buildEditorialPipelineSystemPrompt({ ...base, articleType: "short_update", evidenceSufficient: false });
    expect(thin).toContain("at least 187 words");
    expect(thin).toContain("Do NOT expand through speculation or filler");

    // A depth-correction retry carries its own stronger instruction and must not repeat the first-pass block.
    const retry = buildEditorialPipelineSystemPrompt({
      ...base,
      articleType: "short_update",
      repairContext: { attempt: 1, failureCodes: [], previousWords: 100, minWords: 220, targetWords: 320 },
    });
    expect(retry).not.toContain("HARD MINIMUM");
  });
});

