import { describe, expect, it } from "vitest";

import { decodeCachedPromptResult } from "./prompt-cache";

describe("prompt cache result decoding", () => {
  it("unwraps the stored completion instead of returning a wrapper JSON object", () => {
    const completion =
      '{"headline":"रायपुर अपडेट","summary":"अलग सारांश","sections":{"lead":"मुख्य रिपोर्ट"}}';

    expect(decodeCachedPromptResult({ content: completion })).toBe(completion);
  });

  it("preserves legacy direct JSON completion objects", () => {
    expect(
      decodeCachedPromptResult({
        headline: "Direct cached response",
        summary: "Summary",
      })
    ).toBe(
      '{"headline":"Direct cached response","summary":"Summary"}'
    );
  });
});
