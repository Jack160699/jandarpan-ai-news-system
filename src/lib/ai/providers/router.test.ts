import { afterEach, describe, expect, it, vi } from "vitest";
import {
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
  it("returns gemini->groq->openrouter for editorial_generate, without openai by default", () => {
    expect(resolveChatChain("editorial_generate")).toEqual(["gemini", "groq", "openrouter"]);
  });

  it("returns groq->gemini->openrouter for editorial_review, without openai by default", () => {
    expect(resolveChatChain("editorial_review")).toEqual(["groq", "gemini", "openrouter"]);
  });

  it("falls back to the writer chain default for an unknown operation", () => {
    expect(resolveChatChain("some_unknown_operation")).toEqual(["gemini", "groq", "openrouter"]);
  });

  it("adds openai to the end of every chain when AI_PROVIDER_OPENAI_ENABLED=true", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    expect(resolveChatChain("editorial_generate")).toEqual(["gemini", "groq", "openrouter", "openai"]);
    expect(resolveChatChain("editorial_review")).toEqual(["groq", "gemini", "openrouter", "openai"]);
    expect(resolveChatChain("some_unknown_operation")).toEqual(["gemini", "groq", "openrouter", "openai"]);
  });

  it("removes openai again when the flag is set to anything other than 'true'", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "false");
    expect(resolveChatChain("editorial_generate")).toEqual(["gemini", "groq", "openrouter"]);
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
    expect(resolveReviewerChain()).toEqual(["groq", "gemini", "openrouter"]);
  });

  it("excludes the passed-in writer provider", () => {
    expect(resolveReviewerChain("gemini")).toEqual(["groq", "openrouter"]);
    expect(resolveReviewerChain("groq")).toEqual(["gemini", "openrouter"]);
  });

  it("includes openai (minus the writer provider) once the flag is on", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    expect(resolveReviewerChain("gemini")).toEqual(["groq", "openrouter", "openai"]);
  });

  it("falls back to the full chain if the writer provider isn't in the reviewer chain at all", () => {
    // openai isn't in the reviewer chain when the flag is off, so filtering
    // it out would leave the chain unchanged (not empty) — exercise the
    // "reordered.length ? reordered : chain" fallback with a provider that
    // *is* in the chain but filtering still leaves entries, then separately
    // confirm passing something chain-external is a no-op filter.
    expect(resolveReviewerChain("openai")).toEqual(["groq", "gemini", "openrouter"]);
  });
});
