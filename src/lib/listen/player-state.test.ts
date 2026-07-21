import { describe, expect, it } from "vitest";
import {
  canRetry,
  playerErrorMessage,
  reducePlayerStatus,
  showsPlayingChrome,
  type PlayerStatus,
} from "./player-state";

describe("reducePlayerStatus", () => {
  it("never marks playing from PLAY_REQUEST alone", () => {
    const statuses: PlayerStatus[] = [
      "idle",
      "ready",
      "paused",
      "ended",
      "loading",
    ];
    for (const status of statuses) {
      const next = reducePlayerStatus(status, { type: "PLAY_REQUEST" });
      expect(next).not.toBe("playing");
    }
  });

  it("only PLAYING event yields playing chrome", () => {
    expect(reducePlayerStatus("loading", { type: "PLAYING" })).toBe("playing");
    expect(showsPlayingChrome("playing")).toBe(true);
    expect(showsPlayingChrome("loading")).toBe(false);
    expect(showsPlayingChrome("buffering")).toBe(true);
  });

  it("maps missing/invalid source to unavailable", () => {
    expect(reducePlayerStatus("idle", { type: "SOURCE_MISSING" })).toBe(
      "unavailable"
    );
    expect(
      reducePlayerStatus("ready", {
        type: "SOURCE_INVALID",
        code: "malformed_url",
      })
    ).toBe("unavailable");
  });

  it("ERROR yields failed and supports retry", () => {
    const failed = reducePlayerStatus("playing", {
      type: "ERROR",
      code: "playback_failed",
    });
    expect(failed).toBe("failed");
    expect(canRetry(failed)).toBe(true);
  });

  it("WAITING only buffers while loading/playing", () => {
    expect(reducePlayerStatus("playing", { type: "WAITING" })).toBe(
      "buffering"
    );
    expect(reducePlayerStatus("paused", { type: "WAITING" })).toBe("paused");
  });

  it("ENDED and RESET behave predictably", () => {
    expect(reducePlayerStatus("playing", { type: "ENDED" })).toBe("ended");
    expect(reducePlayerStatus("failed", { type: "RESET" })).toBe("idle");
  });
});

describe("playerErrorMessage", () => {
  it("returns Hindi by default without leaking internals", () => {
    expect(playerErrorMessage("missing_url")).toBe("ऑडियो उपलब्ध नहीं");
    expect(playerErrorMessage("inaccessible")).not.toMatch(/openai|supabase|api/i);
    expect(playerErrorMessage("missing_url", "en")).toBe("Audio unavailable");
  });
});
