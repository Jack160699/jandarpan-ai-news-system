import { describe, expect, it } from "vitest";
import { parseRobustLlmResponse } from "./generate-article";
import { resolveChatChain, isGeminiOnlyMode } from "../../ai/providers/router";

describe("Gemini-Only Robust Parsing", () => {
  it("A. Valid Gemini structured output", () => {
    const raw = JSON.stringify({
      headline: "Test",
      summary: "Test summary",
      sections: { lead: "Lead", details: "Details" }
    });
    const parsed = parseRobustLlmResponse(raw);
    expect(parsed?.headline).toBe("Test");
    expect(parsed?.sections?.lead).toBe("Lead");
  });

  it("B. Gemini fenced JSON", () => {
    const raw = "`json\n{\"headline\":\"Test\",\"summary\":\"Test summary\",\"sections\":{\"lead\":\"Lead\",\"details\":\"Details\"}}\n`";
    const parsed = parseRobustLlmResponse(raw);
    expect(parsed?.headline).toBe("Test");
  });

  it("C. Gemini malformed JSON (recovers if embedded)", () => {
    const raw = "Here is the article:\n{\"headline\":\"Test\",\"summary\":\"Test summary\",\"sections\":{\"lead\":\"Lead\",\"details\":\"Details\"}}\nHope this helps.";
    const parsed = parseRobustLlmResponse(raw);
    expect(parsed?.headline).toBe("Test");
  });

  it("D. Gemini missing sections (legacy aliases mapping)", () => {
    const raw = JSON.stringify({
      headline: "Test",
      excerpt: "Test excerpt",
      body: "Lead paragraph.\n\nDetails paragraph."
    });
    const parsed = parseRobustLlmResponse(raw);
    expect(parsed?.summary).toBe("Test excerpt");
    expect(parsed?.sections?.lead).toBe("Lead paragraph.");
    expect(parsed?.sections?.details).toBe("Details paragraph.");
  });

  it("I. Gemini-only routing", () => {
    process.env.NEWSROOM_GEMINI_ONLY = "true";
    expect(isGeminiOnlyMode()).toBe(true);
    expect(resolveChatChain("editorial_generate")).toEqual(["gemini"]);
  });
});
