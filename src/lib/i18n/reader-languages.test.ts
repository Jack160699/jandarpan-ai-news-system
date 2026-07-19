import { describe, expect, it } from "vitest";
import { GATE_LANGUAGE_IDS } from "@/lib/i18n/gate-languages";
import {
  READER_LANGUAGE_IDS,
  isReaderLanguage,
  toReaderLanguage,
} from "@/lib/i18n/reader-languages";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";

describe("Hindi-first reader languages", () => {
  it("offers exactly Hindi and English to readers", () => {
    expect([...READER_LANGUAGE_IDS]).toEqual(["hi", "en"]);
  });

  it("offers exactly Hindi and English in switcher/gate options", () => {
    expect([...GATE_LANGUAGE_IDS]).toEqual(["hi", "en"]);
  });

  it("no longer treats Chhattisgarhi as a reader language", () => {
    expect(isReaderLanguage("cg")).toBe(false);
  });

  it("falls back legacy stored cg preference to Hindi", () => {
    expect(toReaderLanguage("cg")).toBe("hi");
    expect(normalizeAppLanguage("cg")).toBe("hi");
  });

  it("defaults unknown and missing values to Hindi", () => {
    expect(toReaderLanguage(undefined)).toBe("hi");
    expect(toReaderLanguage("ta")).toBe("hi");
    expect(normalizeAppLanguage(null)).toBe("hi");
  });

  it("keeps English available when explicitly chosen", () => {
    expect(toReaderLanguage("en")).toBe("en");
    expect(normalizeAppLanguage("en")).toBe("en");
  });
});
