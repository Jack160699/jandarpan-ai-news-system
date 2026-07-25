import { describe, expect, it } from "vitest";
import { AD_FORMAT_SPECS } from "./ReservedAd";
import { resolveAdRenderMode } from "../ads/ad-display";

describe("ReservedAd inventory specs", () => {
  it("defines SoT reserved sizes for all formats", () => {
    expect(AD_FORMAT_SPECS.leaderboard).toMatchObject({ w: 728, h: 90 });
    expect(AD_FORMAT_SPECS.billboard).toMatchObject({ w: 970, h: 250 });
    expect(AD_FORMAT_SPECS.sidebar).toMatchObject({ w: 300, h: 250 });
    expect(AD_FORMAT_SPECS.skyscraper).toMatchObject({ w: 300, h: 600 });
    expect(AD_FORMAT_SPECS.inline).toMatchObject({ w: 580, h: 300 });
    expect(AD_FORMAT_SPECS.tablet).toMatchObject({ w: 468, h: 60 });
    expect(AD_FORMAT_SPECS.infeed).toMatchObject({ w: 300, h: 250 });
    expect(AD_FORMAT_SPECS.sponsor).toMatchObject({ w: 728, h: 90 });
    expect(AD_FORMAT_SPECS.sticky).toMatchObject({ w: 320, h: 50 });
  });

  it("documents production hide vs preview for empty creatives", () => {
    expect(resolveAdRenderMode({ hasCreative: false, forcePreview: false })).toBe(
      process.env.NODE_ENV === "development" ||
        process.env.NEXT_PUBLIC_AD_PREVIEW === "1"
        ? "preview"
        : "hidden"
    );
    expect(resolveAdRenderMode({ hasCreative: false, forcePreview: true })).toBe(
      "preview"
    );
    expect(resolveAdRenderMode({ hasCreative: true })).toBe("creative");
  });
});
