import { describe, expect, it } from "vitest";
import { audioGenerationEnabled } from "./enabled";

describe("audioGenerationEnabled", () => {
  it("is OFF by default, even when Google credentials exist", () => {
    expect(audioGenerationEnabled({})).toBe(false);
    expect(audioGenerationEnabled({ GOOGLE_TTS_SERVICE_ACCOUNT_JSON: "{}" })).toBe(false);
    expect(audioGenerationEnabled({ AUDIO_GENERATION_ENABLED: "false" })).toBe(false);
    expect(audioGenerationEnabled({ AUDIO_GENERATION_ENABLED: "" })).toBe(false);
  });

  it("turns on only when explicitly enabled", () => {
    expect(audioGenerationEnabled({ AUDIO_GENERATION_ENABLED: "true" })).toBe(true);
    expect(audioGenerationEnabled({ AUDIO_GENERATION_ENABLED: " TRUE " })).toBe(true);
    expect(audioGenerationEnabled({ AUDIO_GENERATION_ENABLED: "1" })).toBe(true);
  });
});
