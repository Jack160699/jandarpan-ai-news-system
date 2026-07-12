import { getPrioritizedDistricts } from "@/lib/regional/districts";

/** Districts surfaced in the selector — tier 1 & 2 first */
export const DISTRICT_V3_SELECTOR_DISTRICTS = getPrioritizedDistricts()
  .filter((d) => d.priority <= 2)
  .slice(0, 12);

/** Max favorite districts a reader can follow */
export const DISTRICT_V3_MAX_FAVORITES = 6;
