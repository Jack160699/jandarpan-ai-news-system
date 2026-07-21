import { describe, expect, it } from "vitest";
import {
  JD_DS_KEY_COUNT,
  JD_DS_STRINGS,
  jdDsT,
  toJdDsLocale,
  type JdDsStringKey,
} from "./strings";

describe("reader-ds i18n dictionary", () => {
  it("defaults unknown languages to Hindi locale", () => {
    expect(toJdDsLocale(undefined)).toBe("hi");
    expect(toJdDsLocale(null)).toBe("hi");
    expect(toJdDsLocale("hi")).toBe("hi");
    expect(toJdDsLocale("en")).toBe("en");
    expect(toJdDsLocale("or")).toBe("hi");
  });

  it("covers the same keys in Hindi and English", () => {
    const hiKeys = Object.keys(JD_DS_STRINGS.hi).sort();
    const enKeys = Object.keys(JD_DS_STRINGS.en).sort();
    expect(hiKeys).toEqual(enKeys);
    expect(JD_DS_KEY_COUNT).toBe(hiKeys.length);
    expect(JD_DS_KEY_COUNT).toBeGreaterThan(100);
  });

  it("returns English chrome and interpolates vars", () => {
    expect(jdDsT("en", "nav.home")).toBe("Home");
    expect(jdDsT("hi", "nav.home")).toBe("होम");
    expect(jdDsT("en", "profile.savedCount", { n: 3 })).toBe("3 saved");
    expect(jdDsT("hi", "profile.savedCount", { n: 3 })).toBe("3 सहेजी");

    const allKeys = Object.keys(JD_DS_STRINGS.hi) as JdDsStringKey[];
    for (const key of allKeys) {
      expect(jdDsT("en", key).length).toBeGreaterThan(0);
      expect(jdDsT("hi", key).length).toBeGreaterThan(0);
    }
  });

  it("keeps primary nav labels distinct between locales", () => {
    const navKeys: JdDsStringKey[] = [
      "nav.home",
      "nav.district",
      "nav.latest",
      "nav.listen",
      "nav.more",
    ];
    for (const key of navKeys) {
      expect(jdDsT("hi", key)).not.toBe(jdDsT("en", key));
    }
  });
});
