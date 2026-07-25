import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  isAdPreviewMode,
  readStickyAdDismissed,
  resolveAdRenderMode,
  shouldMountStickyAd,
  STICKY_AD_DISMISS_KEY,
  writeStickyAdDismissed,
} from "./ad-display";

describe("ad display rules", () => {
  const prevPreview = process.env.NEXT_PUBLIC_AD_PREVIEW;
  const prevNode = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NEXT_PUBLIC_AD_PREVIEW = prevPreview;
    // @ts-expect-error test override
    process.env.NODE_ENV = prevNode;
    vi.unstubAllGlobals();
  });

  it("hides empty slots for production readers", () => {
    process.env.NEXT_PUBLIC_AD_PREVIEW = "0";
    // @ts-expect-error test override
    process.env.NODE_ENV = "production";
    expect(isAdPreviewMode()).toBe(false);
    expect(resolveAdRenderMode({ hasCreative: false })).toBe("hidden");
  });

  it("shows preview chrome in development or AD_PREVIEW", () => {
    // @ts-expect-error test override
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_AD_PREVIEW = "0";
    expect(isAdPreviewMode()).toBe(true);
    expect(resolveAdRenderMode({ hasCreative: false })).toBe("preview");

    // @ts-expect-error test override
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_AD_PREVIEW = "1";
    expect(isAdPreviewMode()).toBe(true);
  });

  it("uses subtle reserve when requested without creative", () => {
    process.env.NEXT_PUBLIC_AD_PREVIEW = "0";
    // @ts-expect-error test override
    process.env.NODE_ENV = "production";
    expect(
      resolveAdRenderMode({ hasCreative: false, reserveWhenEmpty: true })
    ).toBe("subtle");
  });

  it("prefers creative whenever present", () => {
    process.env.NEXT_PUBLIC_AD_PREVIEW = "0";
    // @ts-expect-error test override
    process.env.NODE_ENV = "production";
    expect(resolveAdRenderMode({ hasCreative: true })).toBe("creative");
  });

  it("does not mount sticky without creative outside preview", () => {
    process.env.NEXT_PUBLIC_AD_PREVIEW = "0";
    // @ts-expect-error test override
    process.env.NODE_ENV = "production";
    expect(shouldMountStickyAd({ hasCreative: false })).toBe(false);
    expect(shouldMountStickyAd({ hasCreative: true })).toBe(true);
    expect(shouldMountStickyAd({ hasCreative: false, forcePreview: true })).toBe(
      true
    );
    expect(shouldMountStickyAd({ hasCreative: true, dismissed: true })).toBe(
      false
    );
  });
});

describe("sticky ad dismiss persistence", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    vi.stubGlobal("window", globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and clears dismiss state", () => {
    expect(readStickyAdDismissed()).toBe(false);
    writeStickyAdDismissed(true);
    expect(sessionStorage.getItem(STICKY_AD_DISMISS_KEY)).toBe("1");
    expect(readStickyAdDismissed()).toBe(true);
    writeStickyAdDismissed(false);
    expect(readStickyAdDismissed()).toBe(false);
  });
});
