export const DISTRICT_PICKER_OPEN_EVENT = "jdp:district-picker-open";

export function requestDistrictPicker() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DISTRICT_PICKER_OPEN_EVENT));
}
