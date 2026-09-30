import { afterEach, describe, expect, it, vi } from "vitest";
import { assertServerOnly, isBrowserRuntime } from "./env";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("assertServerOnly / isBrowserRuntime", () => {
  it("passes on a plain server (no window)", () => {
    expect(isBrowserRuntime()).toBe(false);
    expect(() => assertServerOnly("createAdminServerClient")).not.toThrow();
  });

  it("passes on Supabase Edge, which defines a `window` global but has no `document` (regression: hosted runtime 500)", () => {
    vi.stubGlobal("window", globalThis);
    expect(typeof document).toBe("undefined");
    expect(isBrowserRuntime()).toBe(false);
    expect(() => assertServerOnly("createAdminServerClient")).not.toThrow();
  });

  it("still throws in a real browser (window + document)", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {});
    expect(isBrowserRuntime()).toBe(true);
    expect(() => assertServerOnly("createAdminServerClient")).toThrow(/must run on the server/);
  });
});
