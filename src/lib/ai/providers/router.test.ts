import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isGeminiEditorialFallbackEnabled,
  isOpenAiProviderEnabled,
  resolveChatChain,
  resolveEmbeddingChain,
  resolveImageChain,
  resolveReviewerChain,
} from "./router";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("resolveChatChain", () => {
  it("returns codecraft then groq for editorial_generate: Gemini is NOT in the article-generation path by default", () => {
    expect(resolveChatChain("editorial_generate")).toEqual(["codecraft", "groq"]);
    expect(resolveChatChain("editorial_repair")).toEqual(["codecraft", "groq"]);
  });

  it("keeps Gemini available for secondary work (translation, unknown operations) so its quota is used where approved", () => {
    expect(resolveChatChain("translation")).toContain("gemini");
    expect(resolveChatChain("some_unknown_operation")).toContain("gemini");
  });

  it("allows Gemini as an editorial fallback ONLY when explicitly approved with GEMINI_EDITORIAL_FALLBACK=on", () => {
    for (const v of ["", "true", "1", "yes", "ON_", "off"]) {
      vi.stubEnv("GEMINI_EDITORIAL_FALLBACK", v);
      expect(resolveChatChain("editorial_generate")).not.toContain("gemini");
      expect(isGeminiEditorialFallbackEnabled()).toBe(false);
    }
    vi.stubEnv("GEMINI_EDITORIAL_FALLBACK", "on");
    expect(isGeminiEditorialFallbackEnabled()).toBe(true);
    expect(resolveChatChain("editorial_generate")).toEqual(["codecraft", "gemini", "groq"]);
    expect(resolveChatChain("editorial_repair")).toEqual(["codecraft", "gemini", "groq"]);
  });

  it("never puts Gemini ahead of CodeCraft, and CodeCraft stays first for editorial generation", () => {
    vi.stubEnv("GEMINI_EDITORIAL_FALLBACK", "on");
    expect(resolveChatChain("editorial_generate")[0]).toBe("codecraft");
  });

  it("keeps codecraft OUT of editorial_review (operation-scoped), leaving groq", () => {
    expect(resolveChatChain("editorial_review")).toEqual(["groq"]);
  });

  it("keeps codecraft out of an unknown/lightweight operation", () => {
    expect(resolveChatChain("some_unknown_operation")).toEqual(["gemini", "groq"]);
    expect(resolveChatChain("translation")).not.toContain("codecraft");
  });

  it("uses codecraft for repair, and for other operations only when CODECRAFT_OPERATIONS enables them", () => {
    expect(resolveChatChain("editorial_repair")).toContain("codecraft");
    vi.stubEnv("CODECRAFT_OPERATIONS", "editorial_generate,editorial_review");
    expect(resolveChatChain("editorial_review")).toEqual(["codecraft", "groq"]);
    expect(resolveChatChain("editorial_repair")).not.toContain("codecraft");
  });

  it("keeps editorial chains strictly codecraft/gemini/groq even when AI_PROVIDER_OPENAI_ENABLED=true", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    expect(resolveChatChain("editorial_generate")).toEqual(["codecraft", "groq"]);
    expect(resolveChatChain("editorial_review")).toEqual(["groq"]);
    expect(resolveChatChain("some_unknown_operation")).toEqual(["gemini", "groq"]);
  });

  it("removes openai again when the flag is set to anything other than 'true'", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "false");
    expect(resolveChatChain("editorial_generate")).toEqual(["codecraft", "groq"]);
  });
});

describe("isOpenAiProviderEnabled", () => {
  it("is false when AI_PROVIDER_OPENAI_ENABLED is unset", () => {
    expect(isOpenAiProviderEnabled()).toBe(false);
  });

  it("is true only when AI_PROVIDER_OPENAI_ENABLED is exactly 'true'", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    expect(isOpenAiProviderEnabled()).toBe(true);

    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "1");
    expect(isOpenAiProviderEnabled()).toBe(false);
  });
});

describe("resolveEmbeddingChain", () => {
  it("is cloudflare-only with the openai flag off", () => {
    expect(resolveEmbeddingChain()).toEqual(["cloudflare"]);
  });

  it("adds openai when the flag is on", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    expect(resolveEmbeddingChain()).toEqual(["cloudflare", "openai"]);
  });
});

describe("resolveImageChain", () => {
  it("is cloudflare-only with the openai flag off", () => {
    expect(resolveImageChain()).toEqual(["cloudflare"]);
  });

  it("adds openai when the flag is on", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    expect(resolveImageChain()).toEqual(["cloudflare", "openai"]);
  });
});

describe("resolveReviewerChain", () => {
  it("returns the full reviewer chain when no writer provider is given", () => {
    expect(resolveReviewerChain()).toEqual(["codecraft", "groq"]);
  });

  it("keeps reviewer chain strictly codecraft/groq even when the flag is on", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    expect(resolveReviewerChain()).toEqual(["codecraft", "groq"]);
  });
});
