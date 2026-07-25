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
      depthCorrection: {
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
});
