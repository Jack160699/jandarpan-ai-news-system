/**
 * Commodity matching — provider English strings observed / expected for AGMARKNET.
 * Hindi labels are local chrome only; filters use English provider values.
 */

export type MandiCommodityPref = {
  id: string;
  /** Substrings matched against provider commodity (case-insensitive). */
  match: string[];
  labelHi: string;
  labelEn: string;
};

/** Preference order for homepage selection (max 3–5). */
export const MANDI_COMMODITY_PREFS: MandiCommodityPref[] = [
  {
    id: "paddy",
    match: ["paddy", "dhan"],
    labelHi: "धान",
    labelEn: "Paddy",
  },
  {
    id: "wheat",
    match: ["wheat"],
    labelHi: "गेहूँ",
    labelEn: "Wheat",
  },
  {
    id: "gram",
    match: ["gram", "chana"],
    labelHi: "चना",
    labelEn: "Gram",
  },
  {
    id: "tomato",
    match: ["tomato"],
    labelHi: "टमाटर",
    labelEn: "Tomato",
  },
  {
    id: "onion",
    match: ["onion"],
    labelHi: "प्याज",
    labelEn: "Onion",
  },
];

/** Exact spellings observed / attempted against AGMARKNET (live Preview saw `Chattisgarh`). */
export const MANDI_STATE_FILTERS = ["Chhattisgarh", "Chattisgarh"] as const;

export function localizeCommodity(providerCommodity: string): { hi: string; en: string } {
  const lower = providerCommodity.toLowerCase();
  for (const pref of MANDI_COMMODITY_PREFS) {
    if (pref.match.some((m) => lower.includes(m))) {
      return { hi: pref.labelHi, en: pref.labelEn };
    }
  }
  return { hi: providerCommodity, en: providerCommodity };
}

export function matchesPreferredCommodity(
  providerCommodity: string,
  preferredIds?: string[]
): MandiCommodityPref | null {
  const lower = providerCommodity.toLowerCase();
  const list = preferredIds?.length
    ? MANDI_COMMODITY_PREFS.filter((p) => preferredIds.includes(p.id))
    : MANDI_COMMODITY_PREFS;
  for (const pref of list) {
    if (pref.match.some((m) => lower.includes(m))) return pref;
  }
  return null;
}
