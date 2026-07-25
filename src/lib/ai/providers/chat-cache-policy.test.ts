import { describe, expect, it } from "vitest";

import { allowsPromptCache } from "./chat-cache-policy";

describe("editorial retry cache policy", () => {
  it("allows normal generation to use the cache", () => {
    expect(allowsPromptCache(undefined)).toBe(true);
    expect(allowsPromptCache("default")).toBe(true);
  });

  it("prevents a validation retry from reading or storing cached output", () => {
    expect(allowsPromptCache("bypass")).toBe(false);
  });
});
