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
  it("returns codecraft for editorial_generate, without openai by default", () => {
    expect(resolveChatChain("editorial_generate")).toEqual(["codecraft"]);
  });

  it("returns codecraft for editorial_review, without openai by default", () => {
    expect(resolveChatChain("editorial_review")).toEqual(["codecraft"]);
  });

  it("falls back to the writer chain default for an unknown operation", () => {
    expect(resolveChatChain("some_unknown_operation")).toEqual(["codecraft"]);
  });

  it("keeps editorial chains strictly codecraft even when AI_PROVIDER_OPENAI_ENABLED=true", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    expect(resolveChatChain("editorial_generate")).toEqual(["codecraft"]);
    expect(resolveChatChain("editorial_review")).toEqual(["codecraft"]);
    expect(resolveChatChain("some_unknown_operation")).toEqual(["codecraft"]);
  });

  it("removes openai again when the flag is set to anything other than 'true'", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "false");
    expect(resolveChatChain("editorial_generate")).toEqual(["codecraft"]);
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
    expect(resolveReviewerChain()).toEqual(["codecraft"]);
  });

  it("keeps reviewer chain strictly codecraft even when the flag is on", () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    expect(resolveReviewerChain()).toEqual(["codecraft"]);
  });
});
