import { describe, expect, it } from "vitest";
import { isAiCopilotEnabled } from "@/lib/ai-copilot/config";

describe("config", () => {
  it("reads copilot feature flag", () => {
    const prev = process.env.AI_EDITORIAL_COPILOT;
    process.env.AI_EDITORIAL_COPILOT = "true";
    expect(isAiCopilotEnabled()).toBe(true);
    process.env.AI_EDITORIAL_COPILOT = prev;
  });
});
