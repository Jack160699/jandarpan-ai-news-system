import type { HomepageLayoutPrefs, HomepageModuleId } from "@/lib/personalization/types";
import { sectionsFromFeedInterests } from "@/lib/super-menu/interest-sections";
import type { HomeSectionId } from "@/lib/homepage/types";

export const LAYOUT_STORAGE_KEY = "cgb-home-layout";

export const DEFAULT_HOMEPAGE_ORDER: HomepageModuleId[] = [
  "highlights-desk",
  "recommended",
  "shorts",
  "trending",
  "hyperlocal",
];

export const DEFAULT_LAYOUT_PREFS: HomepageLayoutPrefs = {
  version: 1,
  order: [...DEFAULT_HOMEPAGE_ORDER],
  hidden: [],
  pinned: [],
  onboardingDone: false,
  followedDistricts: [],
};

export function loadHomepageLayout(): HomepageLayoutPrefs {
  if (typeof window === "undefined") return DEFAULT_LAYOUT_PREFS;
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT_PREFS;
    const parsed = JSON.parse(raw) as HomepageLayoutPrefs;
    if (parsed.version !== 1) return DEFAULT_LAYOUT_PREFS;
    return {
      ...DEFAULT_LAYOUT_PREFS,
      ...parsed,
      order: normalizeOrder(parsed.order),
    };
  } catch {
    return DEFAULT_LAYOUT_PREFS;
  }
}

export function saveHomepageLayout(prefs: HomepageLayoutPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(prefs));
}

function normalizeOrder(order: HomepageModuleId[] | undefined): HomepageModuleId[] {
  const valid = new Set(DEFAULT_HOMEPAGE_ORDER);
  const seen = new Set<HomepageModuleId>();
  const out: HomepageModuleId[] = [];
  for (const id of order ?? []) {
    if (valid.has(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of DEFAULT_HOMEPAGE_ORDER) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

type SortHints = {
  interestIds: string[];
  homeDistrict: string | null;
  followedDistricts: string[];
};

function moduleBoost(
  id: HomepageModuleId,
  preferredSections: HomeSectionId[],
  hints: SortHints
): number {
  let score = DEFAULT_HOMEPAGE_ORDER.indexOf(id);
  const hasRegional =
    hints.interestIds.includes("cg-news") ||
    hints.interestIds.includes("raipur") ||
    Boolean(hints.homeDistrict) ||
    hints.followedDistricts.length > 0;

  if (id === "hyperlocal" && hasRegional) score -= 4;
  if (id === "highlights-desk" && hasRegional) score -= 3;
  if (id === "trending" && preferredSections.some((s) => s === "india" || s === "world"))
    score -= 2;
  if (id === "shorts" && hints.interestIds.some((i) => ["sports", "entertainment"].includes(i)))
    score -= 2;
  if (id === "recommended") score -= 1;
  return score;
}

/** Reorder modules — pinned first, then interest-weighted order */
export function sortHomepageModules(
  prefs: HomepageLayoutPrefs,
  hints: SortHints
): HomepageModuleId[] {
  const preferredSections = sectionsFromFeedInterests(hints.interestIds);
  const visible = prefs.order.filter((id) => !prefs.hidden.includes(id));
  const pinned = prefs.pinned.filter((id) => visible.includes(id));
  const unpinned = visible
    .filter((id) => !pinned.includes(id))
    .sort(
      (a, b) =>
        moduleBoost(a, preferredSections, hints) -
        moduleBoost(b, preferredSections, hints)
    );
  return [...pinned, ...unpinned];
}

export function toggleModuleVisibility(
  prefs: HomepageLayoutPrefs,
  id: HomepageModuleId
): HomepageLayoutPrefs {
  const hidden = prefs.hidden.includes(id)
    ? prefs.hidden.filter((x) => x !== id)
    : [...prefs.hidden, id];
  return { ...prefs, hidden };
}

export function toggleModulePin(
  prefs: HomepageLayoutPrefs,
  id: HomepageModuleId
): HomepageLayoutPrefs {
  const pinned = prefs.pinned.includes(id)
    ? prefs.pinned.filter((x) => x !== id)
    : [...prefs.pinned, id].slice(0, 3);
  return { ...prefs, pinned };
}

export function moveModule(
  prefs: HomepageLayoutPrefs,
  id: HomepageModuleId,
  direction: "up" | "down"
): HomepageLayoutPrefs {
  const order = [...prefs.order];
  const idx = order.indexOf(id);
  if (idx < 0) return prefs;
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= order.length) return prefs;
  [order[idx], order[swap]] = [order[swap], order[idx]];
  return { ...prefs, order };
}

export function resetHomepageLayout(): HomepageLayoutPrefs {
  return { ...DEFAULT_LAYOUT_PREFS, onboardingDone: true };
}
